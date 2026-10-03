import {
  limitToLast,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  serverTimestamp,
  set,
  type Unsubscribe,
} from 'firebase/database';
import { collection, doc, getDoc, onSnapshot, query as firestoreQuery, setDoc, where } from 'firebase/firestore';

import type {
  ChatMessage,
  ChatMessageWrite,
  DirectConversationRecord,
  SendMessageInput,
  SendMessageResult,
} from '../types/chat';
import { buildDirectConversationId } from '../utils/conversation';
import { AppError, describeError, isPermissionDenied } from '../utils/errors';
import { isRecord, parseChatMessage, readStringList } from '../utils/parse';
import { validateMessage } from '../utils/validation';
import { getFirebaseDatabase, getFirebaseFirestore } from './firebase';
import { requestPushNotification } from './notificationService';

/**
 * Conversas e mensagens.
 *
 * Firestore:          directConversations/{uidA_uidB} → { id, participantIds, createdAt }
 * Realtime Database:  messages/{conversationId}/{messageId} → ChatMessage
 */

export const MESSAGES_PATH = 'messages';
export const DIRECT_CONVERSATIONS_COLLECTION = 'directConversations';

/** Quantidade de mensagens mantidas em memória por conversa. */
export const MESSAGE_PAGE_SIZE = 200;

/** Cria (se preciso) e devolve o ID da conversa individual entre os dois usuários. */
export async function ensureDirectConversation(currentUid: string, otherUid: string): Promise<string> {
  const conversationId = buildDirectConversationId(currentUid, otherUid);
  const conversationRef = doc(getFirebaseFirestore(), DIRECT_CONVERSATIONS_COLLECTION, conversationId);

  const snapshot = await getDoc(conversationRef);
  if (snapshot.exists()) {
    return conversationId;
  }

  const participantIds: [string, string] = [currentUid, otherUid].sort() as [string, string];
  const record: DirectConversationRecord = { id: conversationId, participantIds, createdAt: Date.now() };
  try {
    await setDoc(conversationRef, record);
  } catch (error) {
    // O outro usuário pode ter criado a mesma conversa no mesmo instante.
    if (isPermissionDenied(error) && (await getDoc(conversationRef)).exists()) {
      return conversationId;
    }
    throw error;
  }
  return conversationId;
}

export function observeDirectConversations(
  uid: string,
  onConversations: (conversations: DirectConversationRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    firestoreQuery(
      collection(getFirebaseFirestore(), DIRECT_CONVERSATIONS_COLLECTION),
      where('participantIds', 'array-contains', uid),
    ),
    (snapshot) => {
      onConversations(
        snapshot.docs.flatMap((item): DirectConversationRecord[] => {
          const data: unknown = item.data();
          const ids = isRecord(data) ? readStringList(data.participantIds) : [];
          const createdAt = isRecord(data) && typeof data.createdAt === 'number' ? data.createdAt : 0;
          return ids.length === 2 ? [{ id: item.id, participantIds: [ids[0], ids[1]], createdAt }] : [];
        }),
      );
    },
    onError,
  );
}

/**
 * Grava a mensagem no Realtime Database e, depois de persistida, pede o
 * push à API online. Uma falha no push não desfaz a mensagem.
 */
export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  const validation = validateMessage(input.text);
  if (!validation.valid) {
    throw new AppError(validation.message);
  }

  const messageRef = push(ref(getFirebaseDatabase(), `${MESSAGES_PATH}/${input.conversationId}`));
  const messageId = messageRef.key;
  if (!messageId) {
    throw new AppError('Não foi possível gerar o identificador da mensagem.');
  }

  const payload: ChatMessageWrite = {
    id: messageId,
    conversationId: input.conversationId,
    conversationType: input.conversationType,
    senderId: input.senderId,
    text: input.text.trim(),
    target: input.target,
    createdAt: serverTimestamp(),
    ...(input.mentionedUserIds.length > 0 ? { mentionedUserIds: [...new Set(input.mentionedUserIds)] } : {}),
  };

  await set(messageRef, payload);

  try {
    await requestPushNotification({ conversationId: input.conversationId, messageId });
    return { messageId, pushError: null };
  } catch (error) {
    return { messageId, pushError: describeError(error, 'Não foi possível enviar a notificação.') };
  }
}

/**
 * Escuta as mensagens em tempo real. Devolve a função de cancelamento —
 * o hook `useChat` chama no cleanup do `useEffect`.
 */
export function observeMessages(
  conversationId: string,
  onMessages: (messages: ChatMessage[]) => void,
  onFailure: (error: Error) => void,
): Unsubscribe {
  const messagesQuery = query(
    ref(getFirebaseDatabase(), `${MESSAGES_PATH}/${conversationId}`),
    orderByChild('createdAt'),
    limitToLast(MESSAGE_PAGE_SIZE),
  );

  return onValue(
    messagesQuery,
    (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((child) => {
        const parsed = parseChatMessage(child.key ?? '', conversationId, child.val());
        if (parsed) {
          messages.push(parsed);
        }
      });
      onMessages(messages);
    },
    onFailure,
  );
}

/** Última mensagem de uma conversa (prévia na lista de conversas). */
export function observeLastMessage(
  conversationId: string,
  onMessage: (message: ChatMessage | null) => void,
): Unsubscribe {
  return onValue(
    query(ref(getFirebaseDatabase(), `${MESSAGES_PATH}/${conversationId}`), orderByChild('createdAt'), limitToLast(1)),
    (snapshot) => {
      let last: ChatMessage | null = null;
      snapshot.forEach((child) => {
        last = parseChatMessage(child.key ?? '', conversationId, child.val());
      });
      onMessage(last);
    },
    // Sem permissão (ex.: removido do grupo): simplesmente não mostra prévia.
    () => onMessage(null),
  );
}

/** Estado da conexão com o Firebase (`.info/connected`). */
export function observeConnection(onChange: (connected: boolean) => void): Unsubscribe {
  return onValue(ref(getFirebaseDatabase(), '.info/connected'), (snapshot) => onChange(snapshot.val() === true));
}
