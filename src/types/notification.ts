import type { ConversationType } from './chat';

/** Documento `users/{uid}/devices/{deviceId}` no Firestore. */
export type DeviceToken = {
  token: string;
  platform: 'ios' | 'android';
  enabled: boolean;
  updatedAt: number;
};

/** Corpo enviado para `POST /notifications/messages` da API. */
export type PushRequest = {
  conversationId: string;
  messageId: string;
};

/** Dados que a API coloca no payload do push. */
export type NotificationData = {
  conversationId: string;
  conversationType: ConversationType;
  messageId: string;
};

export type NotificationPermissionState = 'checking' | 'granted' | 'denied' | 'unsupported';

export type DeviceRegistrationState =
  | { status: 'idle' }
  | { status: 'registering' }
  | { status: 'registered'; token: string }
  | { status: 'unavailable'; reason: string };
