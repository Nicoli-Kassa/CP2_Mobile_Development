import type { ConversationType } from '../types/chat';

/**
 * Identificador determinístico da conversa individual.
 *
 * Os dois `uid` são ordenados e unidos por `_`, então A->B e B->A resolvem
 * sempre para a mesma conversa — não existem duas conversas para o mesmo par.
 *
 * `uid` do Firebase Authentication e IDs automáticos do Firestore são
 * alfanuméricos, então `_` só aparece em IDs de conversa individual. As
 * regras do Realtime Database usam isso para diferenciar os dois tipos.
 */

export const CONVERSATION_ID_SEPARATOR = '_';

export function buildDirectConversationId(uidA: string, uidB: string): string {
  if (uidA === uidB) {
    throw new Error('Você não pode iniciar uma conversa consigo mesmo.');
  }
  return [uidA, uidB].sort().join(CONVERSATION_ID_SEPARATOR);
}

export function participantsFromConversationId(conversationId: string): [string, string] {
  const parts = conversationId.split(CONVERSATION_ID_SEPARATOR);
  if (parts.length !== 2 || parts[0].length === 0 || parts[1].length === 0) {
    throw new Error('Conversa inválida.');
  }
  return [parts[0], parts[1]];
}

/** `uid` do outro participante de uma conversa individual. */
export function otherParticipant(conversationId: string, currentUid: string): string {
  const [first, second] = participantsFromConversationId(conversationId);
  return first === currentUid ? second : first;
}

export function conversationTypeFromId(conversationId: string): ConversationType {
  return conversationId.includes(CONVERSATION_ID_SEPARATOR) ? 'direct' : 'group';
}
