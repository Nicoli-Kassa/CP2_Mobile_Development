import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

import {
  addNotificationTapListener,
  addTokenRefreshListener,
  configureNotificationHandler,
  consumeInitialNotification,
  ensureAndroidChannel,
  getPushToken,
  registerDevice,
  requestNotificationPermission,
} from '../services/notificationService';
import type { DeviceRegistrationState, NotificationData, NotificationPermissionState } from '../types/notification';
import { withTimeout } from '../utils/async';
import { describeError } from '../utils/errors';

configureNotificationHandler();

export type NotificationsState = {
  permission: NotificationPermissionState;
  registration: DeviceRegistrationState;
  retry: () => void;
  openSettings: () => void;
};

/**
 * Registra o aparelho para push e trata o toque nas notificações.
 *
 * - pede permissão; se negada, expõe o estado para a interface avisar;
 * - obtém o Expo Push Token e grava em `users/{uid}/devices/{deviceId}`;
 * - regrava quando o token muda;
 * - chama `onOpenConversation` quando a pessoa toca numa notificação,
 *   inclusive a que abriu o app fechado.
 */
export function useNotifications(
  uid: string,
  onOpenConversation: (data: NotificationData) => void,
): NotificationsState {
  const [permission, setPermission] = useState<NotificationPermissionState>('checking');
  const [registration, setRegistration] = useState<DeviceRegistrationState>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);

  const register = useCallback(async (): Promise<void> => {
    setRegistration({ status: 'registering' });
    try {
      await ensureAndroidChannel();
      const granted = await requestNotificationPermission();
      setPermission(granted ? 'granted' : 'denied');
      if (!granted) {
        setRegistration({ status: 'unavailable', reason: 'Permissão de notificações negada.' });
        return;
      }
      const token = await getPushToken();
      await withTimeout(
        registerDevice(uid, token),
        20000,
        'Não foi possível registrar este dispositivo. Verifique a conexão e tente novamente.',
      );
      setRegistration({ status: 'registered', token });
    } catch (failure) {
      setRegistration({
        status: 'unavailable',
        reason: describeError(failure, 'Não foi possível obter o token deste dispositivo.'),
      });
    }
  }, [uid]);

  useEffect(() => {
    let active = true;
    void register();
    const removeRefresh = addTokenRefreshListener(() => {
      if (active) {
        void register();
      }
    });
    return () => {
      active = false;
      removeRefresh();
    };
  }, [register, attempt]);

  // Se o registro falhou (ex.: sem rede), tenta de novo quando o app volta ao primeiro plano.
  useEffect(() => {
    if (registration.status !== 'unavailable' || permission === 'denied') {
      return undefined;
    }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setAttempt((value) => value + 1);
      }
    });
    return () => subscription.remove();
  }, [registration.status, permission]);

  useEffect(() => {
    const removeTap = addNotificationTapListener(onOpenConversation);
    consumeInitialNotification()
      .then((data) => {
        if (data) {
          onOpenConversation(data);
        }
      })
      .catch(() => undefined);
    return removeTap;
  }, [onOpenConversation]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const openSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  return { permission, registration, retry, openSettings };
}
