/**
 * Tipos de domínio usados pela API.
 *
 * Espelham os tipos do aplicativo (`src/types`) — a API lê os mesmos
 * documentos do Firestore e as mesmas mensagens do Realtime Database.
 */

export type NotificationPolicy =
  | 'all_group_messages'
  | 'mentioned_members'
  | 'direct_messages_only'
  | 'disabled';

export const NOTIFICATION_POLICIES: readonly NotificationPolicy[] = [
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
];

export type ConversationType = 'direct' | 'group';

export type MessageTarget = { type: 'conversation' } | { type: 'member'; memberId: string };

export type StoredMessage = {
  id: string;
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
  createdAt: number;
};

export type GroupData = {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
};

/** Conversa já validada no servidor: é daqui que saem os destinatários. */
export type ConversationContext =
  | { type: 'direct'; conversationId: string; participantIds: [string, string] }
  | { type: 'group'; conversationId: string; group: GroupData };

export type DeviceTokenRecord = {
  userId: string;
  deviceId: string;
  token: string;
};

export type ChatUserProfile = {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  photoUrl: string;
  createdAt: number;
};
