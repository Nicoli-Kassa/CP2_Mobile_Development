import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import type { ChatGroup, CreateGroupInput, GroupSettingsInput } from '../types/group';
import { AppError } from '../utils/errors';
import {
  availableSlots,
  validateGroupName,
  validateMemberCount,
  validateMemberLimit,
} from '../utils/groupValidation';
import { parseGroup } from '../utils/parse';
import { apiRequest } from './apiClient';
import { getFirebaseFirestore } from './firebase';

/**
 * Grupos no Firestore (`groups/{groupId}`).
 *
 * Proteção do limite de integrantes em três camadas:
 *  1. interface: mostra as vagas e bloqueia a seleção acima do limite;
 *  2. este serviço: toda alteração de integrantes/limite roda em
 *     `runTransaction`, que relê o documento e é refeita automaticamente se
 *     outra escrita concorrente acontecer no meio;
 *  3. regras do Firestore: rejeitam qualquer escrita em que
 *     `memberIds.size() > memberLimit`, mesmo vinda de um cliente adulterado.
 */

export const GROUPS_COLLECTION = 'groups';

function groupRef(groupId: string) {
  return doc(getFirebaseFirestore(), GROUPS_COLLECTION, groupId);
}

function assertValid(result: { valid: true } | { valid: false; message: string }): void {
  if (!result.valid) {
    throw new AppError(result.message);
  }
}

function assertOwner(group: ChatGroup, uid: string): void {
  if (group.ownerId !== uid) {
    throw new AppError('Somente o proprietário pode gerenciar este grupo.');
  }
}

export async function createGroup(input: CreateGroupInput): Promise<ChatGroup> {
  const memberIds = [...new Set([input.ownerId, ...input.memberIds])];
  assertValid(validateGroupName(input.name));
  assertValid(validateMemberLimit(input.memberLimit, memberIds.length));
  assertValid(validateMemberCount(memberIds.length, input.memberLimit));

  const ref = doc(collection(getFirebaseFirestore(), GROUPS_COLLECTION));
  const now = Date.now();
  const group: ChatGroup = {
    id: ref.id,
    name: input.name.trim(),
    photoUrl: '',
    ownerId: input.ownerId,
    memberIds,
    memberLimit: input.memberLimit,
    notificationPolicy: input.notificationPolicy,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, group);
  return group;
}

/** Altera nome, limite e política de notificações. */
export async function updateGroupSettings(groupId: string, uid: string, input: GroupSettingsInput): Promise<void> {
  assertValid(validateGroupName(input.name));
  await runTransaction(getFirebaseFirestore(), async (transaction) => {
    const snapshot = await transaction.get(groupRef(groupId));
    const group = snapshot.exists() ? parseGroup(snapshot.id, snapshot.data()) : null;
    if (!group) {
      throw new AppError('Grupo não encontrado.');
    }
    assertOwner(group, uid);
    // Relido dentro da transação: o limite nunca fica abaixo da quantidade atual.
    assertValid(validateMemberLimit(input.memberLimit, group.memberIds.length));
    transaction.update(groupRef(groupId), {
      name: input.name.trim(),
      memberLimit: input.memberLimit,
      notificationPolicy: input.notificationPolicy,
      updatedAt: Date.now(),
    });
  });
}

export async function updateGroupPhoto(groupId: string, photoUrl: string): Promise<void> {
  await updateDoc(groupRef(groupId), { photoUrl, updatedAt: Date.now() });
}

/** Adiciona integrantes respeitando o limite, mesmo com escritas simultâneas. */
export async function addGroupMembers(groupId: string, uid: string, newMemberIds: readonly string[]): Promise<void> {
  await runTransaction(getFirebaseFirestore(), async (transaction) => {
    const snapshot = await transaction.get(groupRef(groupId));
    const group = snapshot.exists() ? parseGroup(snapshot.id, snapshot.data()) : null;
    if (!group) {
      throw new AppError('Grupo não encontrado.');
    }
    assertOwner(group, uid);

    const toAdd = [...new Set(newMemberIds)].filter((id) => !group.memberIds.includes(id));
    if (toAdd.length === 0) {
      return;
    }
    const slots = availableSlots(group.memberIds.length, group.memberLimit);
    if (toAdd.length > slots) {
      throw new AppError(
        slots === 0
          ? 'O grupo atingiu o limite de integrantes.'
          : `Só há ${slots} vaga(s) disponível(is) neste grupo.`,
      );
    }
    transaction.update(groupRef(groupId), {
      memberIds: [...group.memberIds, ...toAdd],
      updatedAt: Date.now(),
    });
  });
}

export async function removeGroupMember(groupId: string, uid: string, memberId: string): Promise<void> {
  await runTransaction(getFirebaseFirestore(), async (transaction) => {
    const snapshot = await transaction.get(groupRef(groupId));
    const group = snapshot.exists() ? parseGroup(snapshot.id, snapshot.data()) : null;
    if (!group) {
      throw new AppError('Grupo não encontrado.');
    }
    assertOwner(group, uid);
    if (memberId === group.ownerId) {
      throw new AppError('O proprietário não pode ser removido do grupo.');
    }
    const remaining = group.memberIds.filter((id) => id !== memberId);
    if (remaining.length === group.memberIds.length) {
      return;
    }
    assertValid(validateMemberCount(remaining.length, group.memberLimit));
    transaction.update(groupRef(groupId), { memberIds: remaining, updatedAt: Date.now() });
  });
}

/**
 * Pede à API que copie os integrantes do Firestore para o Realtime Database
 * (`groupMembers/{groupId}`), usado pelas regras das mensagens.
 */
export async function syncGroupMembers(groupId: string): Promise<void> {
  await apiRequest(`/groups/${encodeURIComponent(groupId)}/sync-members`, { method: 'POST' });
}

export function observeGroup(
  groupId: string,
  onGroup: (group: ChatGroup | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    groupRef(groupId),
    (snapshot) => onGroup(snapshot.exists() ? parseGroup(snapshot.id, snapshot.data()) : null),
    onError,
  );
}

export function observeUserGroups(
  uid: string,
  onGroups: (groups: ChatGroup[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(getFirebaseFirestore(), GROUPS_COLLECTION), where('memberIds', 'array-contains', uid)),
    (snapshot) => {
      onGroups(
        snapshot.docs.flatMap((item) => {
          const parsed = parseGroup(item.id, item.data());
          return parsed ? [parsed] : [];
        }),
      );
    },
    onError,
  );
}
