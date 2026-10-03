/** Tipos de domínio das conversas e mensagens. */

export type ConversationType = 'direct' | 'group';

/** Conversa entre exatamente duas pessoas (`directConversations/{id}` no Firestore). */
export type DirectConversation = {
  id: string;
  type: 'direct';
  /** A tupla garante, no nível de tipo, que a conversa tem dois participantes. */
  participants: [string, string];
  createdAt: number;
};

/** Formato gravado no Firestore em `directConversations/{id}`. */
export type DirectConversationRecord = {
  id: string;
  participantIds: [string, string];
  createdAt: number;
};

/** Destino de uma mensagem: o grupo todo ou um integrante específico. */
export type MessageTarget = { type: 'conversation' } | { type: 'member'; memberId: string };

/** Mensagem persistida no Realtime Database em `messages/{conversationId}/{messageId}`. */
export type ChatMessage = {
  id: string;
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
  createdAt: number;
};

/**
 * Mensagem no momento da escrita: `createdAt` ainda é o marcador
 * `serverTimestamp()` e só vira `number` depois que o servidor resolve.
 * `mentionedUserIds` é omitido quando vazio (o Realtime Database não guarda arrays vazios).
 */
export type ChatMessageWrite = Omit<ChatMessage, 'createdAt' | 'mentionedUserIds'> & {
  createdAt: object;
  mentionedUserIds?: string[];
};

/** Dados necessários para enviar uma mensagem. */
export type SendMessageInput = {
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
};

/** Resultado do envio: a mensagem foi gravada; o push pode ter falhado separadamente. */
export type SendMessageResult = {
  messageId: string;
  pushError: string | null;
};

/** Item da lista de conversas (individual ou grupo). */
export type ConversationSummary = {
  id: string;
  type: ConversationType;
  title: string;
  photoUrl: string;
  /** `uid` do outro participante nas conversas individuais. */
  otherUserId: string | null;
  memberCount: number;
  sortKey: number;
};
