import { createContext, useContext } from 'react';

import type { NotificationsState } from '../hooks/useNotifications';

/** Estado do registro de push, compartilhado com as telas (avisos de permissão/token). */
export const NotificationStatusContext = createContext<NotificationsState | null>(null);

export function useNotificationStatus(): NotificationsState {
  const context = useContext(NotificationStatusContext);
  if (!context) {
    throw new Error('useNotificationStatus precisa estar dentro do AppNavigator.');
  }
  return context;
}
