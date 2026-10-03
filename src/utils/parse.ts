import type { ChatMessage, MessageTarget } from '../types/chat';
import type { ChatGroup, NotificationPolicy } from '../types/group';
import type { PrivateProfile, PublicUser } from '../types/user';

/**
 * Conversão de dados crus do Firebase em tipos do domínio.
 *
 * Os SDKs devolvem objetos sem tipo; tudo entra como `unknown` e só vira
 * tipo do app depois de validado aqui.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

function readNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** O Realtime Database pode devolver listas como array ou como objeto `{0: ..., 1: ...}`. */
export function readStringList(value: unknown): string[] {
  const items = Array.isArray(value) ? value : isRecord(value) ? Object.values(value) : [];
  return items.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

export const NOTIFICATION_POLICIES: readonly NotificationPolicy[] = [
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
];

export function isNotificationPolicy(value: unknown): value is NotificationPolicy {
  return typeof value === 'string' && (NOTIFICATION_POLICIES as readonly string[]).includes(value);
}

export function parsePublicUser(uid: string, value: unknown): PublicUser | null {
  if (!isRecord(value)) {
    return null;
  }
  const name = readString(value, 'name');
  if (!name || name.trim().length === 0) {
    return null;
  }
  return {
    uid,
    name: name.trim(),
    photoUrl: readString(value, 'photoUrl') ?? '',
    createdAt: readNumber(value, 'createdAt') ?? 0,
  };
}

export function parsePrivateProfile(value: unknown): PrivateProfile {
  const record = isRecord(value) ? value : {};
  return {
    email: readString(record, 'email') ?? '',
    phoneNumber: readString(record, 'phoneNumber') ?? '',
    birthDate: readString(record, 'birthDate') ?? '',
  };
}

export function parseGroup(id: string, value: unknown): ChatGroup | null {
  if (!isRecord(value)) {
    return null;
  }
  const name = readString(value, 'name');
  const ownerId = readString(value, 'ownerId');
  const memberLimit = readNumber(value, 'memberLimit');
  if (!name || !ownerId || memberLimit === null) {
    return null;
  }
  return {
    id,
    name,
    photoUrl: readString(value, 'photoUrl') ?? '',
    ownerId,
    memberIds: readStringList(value.memberIds),
    memberLimit,
    notificationPolicy: isNotificationPolicy(value.notificationPolicy)
      ? value.notificationPolicy
      : 'all_group_messages',
    createdAt: readNumber(value, 'createdAt') ?? 0,
    updatedAt: readNumber(value, 'updatedAt') ?? 0,
  };
}

function parseTarget(value: unknown): MessageTarget {
  if (isRecord(value) && value.type === 'member' && typeof value.memberId === 'string') {
    return { type: 'member', memberId: value.memberId };
  }
  return { type: 'conversation' };
}

export function parseChatMessage(id: string, conversationId: string, value: unknown): ChatMessage | null {
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
    // Enquanto o servidor não confirma o `serverTimestamp`, usa o horário local.
    createdAt: readNumber(value, 'createdAt') ?? Date.now(),
  };
}
