import {
  collection,
  doc,
  documentId,
  getDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';

import type { ChatUser, PrivateProfile, PublicUser } from '../types/user';
import { AppError } from '../utils/errors';
import { isRecord, parsePrivateProfile, parsePublicUser } from '../utils/parse';
import { apiRequest } from './apiClient';
import { getFirebaseFirestore } from './firebase';

/**
 * Perfis no Firestore.
 *
 *   users/{uid}                  → { uid, name, photoUrl, createdAt }   (público p/ autenticados)
 *   users/{uid}/private/profile  → { email, phoneNumber, birthDate }    (somente o dono)
 *
 * Os dados cadastrais de outra pessoa são lidos pela API, que confere se
 * existe conversa ou grupo em comum.
 */

export const USERS_COLLECTION = 'users';

function privateProfileRef(uid: string) {
  return doc(getFirebaseFirestore(), USERS_COLLECTION, uid, 'private', 'profile');
}

/** Grava perfil público e dados cadastrais de uma só vez (batch atômico). */
export async function createUserProfile(
  publicData: PublicUser,
  privateData: PrivateProfile,
): Promise<void> {
  const firestore = getFirebaseFirestore();
  const batch = writeBatch(firestore);
  batch.set(doc(firestore, USERS_COLLECTION, publicData.uid), publicData);
  batch.set(privateProfileRef(publicData.uid), privateData);
  await batch.commit();
}

/** Perfil completo do próprio usuário (lido direto do Firestore). */
export async function fetchOwnProfile(uid: string): Promise<ChatUser | null> {
  const [publicSnap, privateSnap] = await Promise.all([
    getDoc(doc(getFirebaseFirestore(), USERS_COLLECTION, uid)),
    getDoc(privateProfileRef(uid)),
  ]);
  const publicData = publicSnap.exists() ? parsePublicUser(uid, publicSnap.data()) : null;
  if (!publicData) {
    return null;
  }
  return { ...publicData, ...parsePrivateProfile(privateSnap.exists() ? privateSnap.data() : null) };
}

/** Perfil completo de outra pessoa, liberado pela API somente com conversa/grupo em comum. */
export async function fetchSharedProfile(uid: string): Promise<ChatUser> {
  const body = await apiRequest(`/users/${encodeURIComponent(uid)}/profile`, { method: 'GET' });
  const publicData = isRecord(body) ? parsePublicUser(uid, body) : null;
  if (!publicData) {
    throw new AppError('Perfil não encontrado.');
  }
  return { ...publicData, ...parsePrivateProfile(body) };
}

/** Lista de usuários cadastrados em tempo real (somente dados públicos). */
export function observeUsers(
  onUsers: (users: PublicUser[]) => void,
  onFailure: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(getFirebaseFirestore(), USERS_COLLECTION),
    (snapshot) => {
      const users = snapshot.docs.flatMap((item) => {
        const parsed = parsePublicUser(item.id, item.data());
        return parsed ? [parsed] : [];
      });
      onUsers(users);
    },
    onFailure,
  );
}

/** Limite do operador `in` do Firestore. */
const IN_QUERY_LIMIT = 30;

/** Observa os perfis públicos de uma lista de `uid` (nomes/fotos no chat e nas listas). */
export function observeUsersByIds(
  uids: readonly string[],
  onUsers: (users: Record<string, PublicUser>) => void,
  onFailure: (error: Error) => void,
): Unsubscribe {
  const unique = [...new Set(uids)];
  if (unique.length === 0) {
    onUsers({});
    return () => undefined;
  }

  const chunks: string[][] = [];
  for (let index = 0; index < unique.length; index += IN_QUERY_LIMIT) {
    chunks.push(unique.slice(index, index + IN_QUERY_LIMIT));
  }

  const partials: Record<string, PublicUser>[] = chunks.map(() => ({}));
  const unsubscribes = chunks.map((chunk, chunkIndex) =>
    onSnapshot(
      query(collection(getFirebaseFirestore(), USERS_COLLECTION), where(documentId(), 'in', chunk)),
      (snapshot) => {
        const next: Record<string, PublicUser> = {};
        snapshot.docs.forEach((item) => {
          const parsed = parsePublicUser(item.id, item.data());
          if (parsed) {
            next[item.id] = parsed;
          }
        });
        partials[chunkIndex] = next;
        onUsers(Object.assign({}, ...partials));
      },
      onFailure,
    ),
  );

  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}
