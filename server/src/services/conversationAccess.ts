import type { ChatUserProfile, ConversationContext, GroupData, StoredMessage } from '../types/group';
import { HttpError } from '../utils/httpError';
import { isRecord, parseGroup, parseStoredMessage, readString, readStringList } from '../utils/parse';
import { adminDatabase, adminFirestore } from './firebaseAdmin';

/**
 * Validações que dependem do Firestore E do Realtime Database ao mesmo
 * tempo — por isso ficam na API, e não nas regras de segurança.
 *
 * Convenção de IDs (a mesma do app):
 *  - conversa direta: `<uidMenor>_<uidMaior>` (sempre contém `_`);
 *  - grupo: ID automático do Firestore (nunca contém `_`).
 */

export function isDirectConversationId(conversationId: string): boolean {
  return conversationId.includes('_');
}

export function buildDirectConversationId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

export async function loadMessage(conversationId: string, messageId: string): Promise<StoredMessage | null> {
  const snapshot = await adminDatabase().ref(`messages/${conversationId}/${messageId}`).get();
  if (!snapshot.exists()) {
    return null;
  }
  const raw: unknown = snapshot.val();
  return parseStoredMessage(messageId, conversationId, raw);
}

export async function loadGroup(groupId: string): Promise<GroupData | null> {
  const snapshot = await adminFirestore().collection('groups').doc(groupId).get();
  if (!snapshot.exists) {
    return null;
  }
  const raw: unknown = snapshot.data();
  return parseGroup(snapshot.id, raw);
}

async function loadDirectParticipants(conversationId: string): Promise<[string, string] | null> {
  const snapshot = await adminFirestore().collection('directConversations').doc(conversationId).get();
  if (!snapshot.exists) {
    return null;
  }
  const raw: unknown = snapshot.data();
  const ids = isRecord(raw) ? readStringList(raw.participantIds) : [];
  if (ids.length !== 2 || buildDirectConversationId(ids[0], ids[1]) !== conversationId) {
    return null;
  }
  return [ids[0], ids[1]];
}

/**
 * Carrega a conversa e confirma que `uid` participa dela.
 * Lança 404/403 quando a conversa não existe ou o usuário não faz parte.
 */
export async function loadConversationFor(uid: string, conversationId: string): Promise<ConversationContext> {
  if (isDirectConversationId(conversationId)) {
    const participantIds = await loadDirectParticipants(conversationId);
    if (!participantIds) {
      throw new HttpError(404, 'Conversa não encontrada.');
    }
    if (!participantIds.includes(uid)) {
      throw new HttpError(403, 'Você não participa desta conversa.');
    }
    return { type: 'direct', conversationId, participantIds };
  }

  const group = await loadGroup(conversationId);
  if (!group) {
    throw new HttpError(404, 'Grupo não encontrado.');
  }
  if (!group.memberIds.includes(uid)) {
    throw new HttpError(403, 'Você não é integrante deste grupo.');
  }
  return { type: 'group', conversationId, group };
}

/** `true` quando os dois usuários têm uma conversa individual ou um grupo em comum. */
export async function sharesConversation(uid: string, otherUid: string): Promise<boolean> {
  if (uid === otherUid) {
    return true;
  }
  if (await loadDirectParticipants(buildDirectConversationId(uid, otherUid))) {
    return true;
  }
  const groups = await adminFirestore()
    .collection('groups')
    .where('memberIds', 'array-contains', uid)
    .get();
  return groups.docs.some((doc) => {
    const raw: unknown = doc.data();
    return isRecord(raw) && readStringList(raw.memberIds).includes(otherUid);
  });
}

export async function loadFullProfile(uid: string): Promise<ChatUserProfile | null> {
  const userRef = adminFirestore().collection('users').doc(uid);
  const [publicSnap, privateSnap] = await Promise.all([
    userRef.get(),
    userRef.collection('private').doc('profile').get(),
  ]);
  if (!publicSnap.exists) {
    return null;
  }
  const pub: unknown = publicSnap.data();
  const priv: unknown = privateSnap.exists ? privateSnap.data() : {};
  if (!isRecord(pub)) {
    return null;
  }
  const privateData = isRecord(priv) ? priv : {};
  return {
    uid,
    name: readString(pub, 'name') ?? '',
    photoUrl: readString(pub, 'photoUrl') ?? '',
    createdAt: typeof pub.createdAt === 'number' ? pub.createdAt : 0,
    email: readString(privateData, 'email') ?? '',
    phoneNumber: readString(privateData, 'phoneNumber') ?? '',
    birthDate: readString(privateData, 'birthDate') ?? '',
  };
}

export async function loadUserName(uid: string): Promise<string> {
  const snapshot = await adminFirestore().collection('users').doc(uid).get();
  const raw: unknown = snapshot.data();
  const name = isRecord(raw) ? readString(raw, 'name') : null;
  return name && name.trim().length > 0 ? name.trim() : 'Alguém';
}
