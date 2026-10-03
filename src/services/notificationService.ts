import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsModule from 'expo-notifications';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { EAS_PROJECT_ID } from '../config/appConfig';
import type { DeviceToken, NotificationData, PushRequest } from '../types/notification';
import { AppError } from '../utils/errors';
import { isRecord } from '../utils/parse';
import { apiRequest } from './apiClient';
import { getFirebaseFirestore } from './firebase';

/**
 * Notificações no aplicativo: permissão, registro do dispositivo e toque.
 *
 * O envio do push NUNCA acontece aqui: o app só pede à API online
 * (`requestPushNotification`), que calcula os destinatários e envia.
 */

/**
 * O Expo Go não suporta push remoto desde o SDK 53 e o `expo-notifications`
 * lança erro já ao ser importado. Por isso o módulo só é carregado fora do
 * Expo Go; lá, as notificações ficam desativadas e o chat segue funcionando.
 */
export const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let notificationsModule: typeof NotificationsModule | null = null;

function loadNotifications(): typeof NotificationsModule | null {
  if (IS_EXPO_GO) {
    return null;
  }
  if (!notificationsModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsModule = require('expo-notifications') as typeof NotificationsModule;
  }
  return notificationsModule;
}

export const ANDROID_CHANNEL_ID = 'messages';
const DEVICE_ID_KEY = 'cp2chat.deviceId';

/** Conversa aberta na tela — não mostra banner de push dela mesma. */
let activeConversationId: string | null = null;

export function setActiveConversation(conversationId: string | null): void {
  activeConversationId = conversationId;
}

export function parseNotificationData(value: unknown): NotificationData | null {
  if (!isRecord(value)) {
    return null;
  }
  const { conversationId, conversationType, messageId } = value;
  if (typeof conversationId !== 'string' || (conversationType !== 'direct' && conversationType !== 'group')) {
    return null;
  }
  return { conversationId, conversationType, messageId: typeof messageId === 'string' ? messageId : '' };
}

let handlerConfigured = false;

/** Comportamento das notificações com o app em primeiro plano. */
export function configureNotificationHandler(): void {
  if (handlerConfigured) {
    return;
  }
  handlerConfigured = true;
  loadNotifications()?.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = parseNotificationData(notification.request.content.data);
      const isOpen = data !== null && data.conversationId === activeConversationId;
      return {
        shouldShowBanner: !isOpen,
        shouldShowList: !isOpen,
        shouldPlaySound: !isOpen,
        shouldSetBadge: false,
      };
    },
  });
}

export async function ensureAndroidChannel(): Promise<void> {
  const Notifications = loadNotifications();
  if (Notifications && Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Mensagens',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 150, 200],
    });
  }
}

/** Solicita a permissão (se ainda não foi decidida) e devolve se foi concedida. */
export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = loadNotifications();
  if (!Notifications) {
    // No Expo Go o aviso de indisponibilidade vem de `getPushToken`.
    return true;
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  if (!current.canAskAgain) {
    return false;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Expo Push Token do aparelho. Lança `AppError` com o motivo quando não há token disponível. */
export async function getPushToken(): Promise<string> {
  const Notifications = loadNotifications();
  if (!Notifications) {
    throw new AppError('Notificações push não funcionam no Expo Go. Use um development build.');
  }
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    throw new AppError('Notificações push só funcionam no Android e no iOS.');
  }
  if (!Device.isDevice) {
    throw new AppError('Notificações push exigem um dispositivo físico.');
  }
  if (!EAS_PROJECT_ID) {
    throw new AppError('Projeto EAS não configurado (rode `eas init`).');
  }
  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });
    return token.data;
  } catch (error) {
    // Mostra o motivo do sistema (ex.: SERVICE_NOT_AVAILABLE, FirebaseApp não inicializado)
    // para que a falha possa ser diagnosticada sem depurar o aparelho.
    const detail = error instanceof Error ? error.message.replace(/\s+/g, ' ').trim().slice(0, 160) : '';
    throw new AppError(
      detail
        ? `Não foi possível obter o token deste dispositivo (${detail}).`
        : 'Não foi possível obter o token deste dispositivo.',
    );
  }
}

/** Identificador estável desta instalação (um documento por aparelho). */
async function getDeviceId(): Promise<string> {
  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored) {
    return stored;
  }
  const created = `${Platform.OS}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

/** Grava/atualiza o token em `users/{uid}/devices/{deviceId}`. */
export async function registerDevice(uid: string, token: string): Promise<void> {
  const deviceId = await getDeviceId();
  const device: DeviceToken = {
    token,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    enabled: true,
    updatedAt: Date.now(),
  };
  await setDoc(doc(getFirebaseFirestore(), 'users', uid, 'devices', deviceId), device);
}

/** No logout: este aparelho deixa de receber push da conta. */
export async function disableDevice(uid: string): Promise<void> {
  const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    return;
  }
  await updateDoc(doc(getFirebaseFirestore(), 'users', uid, 'devices', deviceId), {
    enabled: false,
    updatedAt: Date.now(),
  });
}

/** Pede à API online o envio do push de uma mensagem já persistida. */
export async function requestPushNotification(request: PushRequest): Promise<void> {
  await apiRequest('/notifications/messages', { method: 'POST', body: request });
}

/** Toques em notificações com o app aberto ou em segundo plano. */
export function addNotificationTapListener(onTap: (data: NotificationData) => void): () => void {
  const Notifications = loadNotifications();
  if (!Notifications) {
    return () => undefined;
  }
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = parseNotificationData(response.notification.request.content.data);
    if (data) {
      onTap(data);
    }
  });
  return () => subscription.remove();
}

/** Notificação que abriu o app quando ele estava fechado. */
export async function consumeInitialNotification(): Promise<NotificationData | null> {
  const Notifications = loadNotifications();
  if (!Notifications) {
    return null;
  }
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) {
    return null;
  }
  await Notifications.clearLastNotificationResponseAsync();
  return parseNotificationData(response.notification.request.content.data);
}

/** O token nativo pode mudar; nesse caso o Expo Push Token é registrado de novo. */
export function addTokenRefreshListener(onRefresh: () => void): () => void {
  const Notifications = loadNotifications();
  if (!Notifications) {
    return () => undefined;
  }
  const subscription = Notifications.addPushTokenListener(() => onRefresh());
  return () => subscription.remove();
}
