/** Tipos relacionados a grupos de chat. */

export type NotificationPolicy =
  | 'all_group_messages'
  | 'mentioned_members'
  | 'direct_messages_only'
  | 'disabled';

/** Documento `groups/{groupId}` no Firestore. */
export type ChatGroup = {
  id: string;
  name: string;
  photoUrl: string;
  ownerId: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
  createdAt: number;
  updatedAt: number;
};

/** Dados usados para criar um grupo. */
export type CreateGroupInput = {
  name: string;
  ownerId: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
};

/** Configurações que o proprietário pode alterar depois da criação. */
export type GroupSettingsInput = {
  name: string;
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
};

/** Política de notificação vigente em uma conversa. */
export type NotificationSettings = {
  conversationId: string;
  policy: NotificationPolicy;
  updatedBy: string;
  updatedAt: number;
};
