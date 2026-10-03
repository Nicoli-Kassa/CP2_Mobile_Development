import {
  NOTIFICATION_POLICIES,
  type GroupData,
  type MessageTarget,
  type NotificationPolicy,
  type StoredMessage,
} from '../types/group';

/**
 * Conversão de dados crus (Firestore / Realtime Database) em tipos do domínio.
 *
 * Os SDKs devolvem valores sem tipo; aqui tudo entra como `unknown` e só
 * sai depois de validado — nenhum `any` atravessa a API.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

/** O Realtime Database pode devolver listas como array ou como objeto `{0: ..., 1: ...}`. */
export function readStringList(value: unknown): string[] {
  const items = Array.isArray(value) ? value : isRecord(value) ? Object.values(value) : [];
  return items.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

export function isNotificationPolicy(value: unknown): value is NotificationPolicy {
  return typeof value === 'string' && (NOTIFICATION_POLICIES as readonly string[]).includes(value);
}

/** IDs aceitos nos caminhos do banco: evita injeção de `/`, `.`, `#`, `$`, `[` e `]`. */
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

export function isSafeId(value: unknown): value is string {
  return typeof value === 'string' && SAFE_ID.test(value);
}

function parseTarget(value: unknown): MessageTarget {
  if (isRecord(value) && value.type === 'member' && typeof value.memberId === 'string') {
    return { type: 'member', memberId: value.memberId };
  }
  return { type: 'conversation' };
}

export function parseStoredMessage(id: string, conversationId: string, value: unknown): StoredMessage | null {
  if (!isRecord(value)) {
    return null;
  }
  const senderId = readString(value, 'senderId');
  const text = readString(value, 'text');
  const conversationType = value.conversationType;
  if (!senderId || text === null || (conversationType !== 'direct' && conversationType !== 'group')) {
    return null;
  }
  return {
    id,
    conversationId,
    conversationType,
    senderId,
    text,
    target: parseTarget(value.target),
    mentionedUserIds: readStringList(value.mentionedUserIds),
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : 0,
  };
}

export function parseGroup(id: string, value: unknown): GroupData | null {
  if (!isRecord(value)) {
    return null;
  }
  const ownerId = readString(value, 'ownerId');
  const name = readString(value, 'name');
  const memberLimit = value.memberLimit;
  if (!ownerId || name === null || typeof memberLimit !== 'number') {
    return null;
  }
  return {
    id,
    name,
    ownerId,
    memberIds: readStringList(value.memberIds),
    memberLimit,
    notificationPolicy: isNotificationPolicy(value.notificationPolicy)
      ? value.notificationPolicy
      : 'all_group_messages',
  };
}
