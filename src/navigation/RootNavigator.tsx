import React, { useCallback, useRef } from 'react';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Loading } from '../components/Loading';
import { useAuth, useCurrentUser } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { ChatScreen } from '../screens/ChatScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { GroupFormScreen } from '../screens/GroupFormScreen';
import { GroupMembersScreen } from '../screens/GroupMembersScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { UsersScreen } from '../screens/UsersScreen';
import { colors } from '../theme/theme';
import type { AppStackParamList, AuthStackParamList } from '../types/navigation';
import type { NotificationData } from '../types/notification';
import { NotificationStatusContext } from './NotificationStatusContext';

/**
 * Fluxo do app.
 *
 * As rotas autenticadas só existem enquanto houver sessão: no logout o
 * `status` muda, a pilha autenticada é desmontada (removendo os listeners
 * das telas) e a navegação volta para o login.
 */

const AppStack = createNativeStackNavigator<AppStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

export const navigationRef = createNavigationContainerRef<AppStackParamList>();

function AuthNavigator(): React.JSX.Element {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

type AppNavigatorProps = {
  onOpenConversation: (data: NotificationData) => void;
};

function AppNavigator({ onOpenConversation }: AppNavigatorProps): React.JSX.Element {
  const user = useCurrentUser();
  const notifications = useNotifications(user.uid, onOpenConversation);

  return (
    <NotificationStatusContext.Provider value={notifications}>
      <AppStack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.background },
        }}>
        <AppStack.Screen name="Conversations" component={ConversationsScreen} options={{ headerShown: false }} />
        <AppStack.Screen name="Users" component={UsersScreen} options={{ title: 'Usuários' }} />
        <AppStack.Screen name="GroupForm" component={GroupFormScreen} options={{ title: 'Grupo' }} />
        <AppStack.Screen name="Chat" component={ChatScreen} options={{ title: 'Conversa' }} />
        <AppStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
        <AppStack.Screen name="GroupMembers" component={GroupMembersScreen} options={{ title: 'Integrantes' }} />
      </AppStack.Navigator>
    </NotificationStatusContext.Provider>
  );
}

export function RootNavigator(): React.JSX.Element {
  const { status } = useAuth();
  /** Toque em notificação recebido antes de a navegação estar pronta. */
  const pendingRef = useRef<NotificationData | null>(null);

  const navigateToConversation = useCallback((data: NotificationData) => {
    navigationRef.navigate('Chat', {
      conversationId: data.conversationId,
      conversationType: data.conversationType,
    });
  }, []);

  const openConversation = useCallback(
    (data: NotificationData) => {
      if (navigationRef.isReady()) {
        navigateToConversation(data);
      } else {
        pendingRef.current = data;
      }
    },
    [navigateToConversation],
  );

  const handleReady = useCallback(() => {
    if (pendingRef.current) {
      navigateToConversation(pendingRef.current);
      pendingRef.current = null;
    }
  }, [navigateToConversation]);

  if (status === 'initializing') {
    return <Loading variant="full" message="Verificando sua sessão..." />;
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={handleReady}>
      {status === 'authenticated' ? <AppNavigator onOpenConversation={openConversation} /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
