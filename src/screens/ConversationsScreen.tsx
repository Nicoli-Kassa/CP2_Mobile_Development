import React, { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItemInfo } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '../components/AppButton';
import { Avatar } from '../components/Avatar';
import { ConversationItem } from '../components/ConversationItem';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { NoticeBanner } from '../components/NoticeBanner';
import { ScreenContainer } from '../components/ScreenContainer';
import { useAuth, useCurrentUser } from '../hooks/useAuth';
import { useConnection } from '../hooks/useConnection';
import { useConversations, type ConversationListItem } from '../hooks/useConversations';
import { useNotificationStatus } from '../navigation/NotificationStatusContext';
import { colors, fontSize, radius, spacing } from '../theme/theme';
import type { AppStackParamList } from '../types/navigation';

type ConversationsScreenProps = NativeStackScreenProps<AppStackParamList, 'Conversations'>;

/** Lista de conversas individuais e grupos. */
export function ConversationsScreen({ navigation }: ConversationsScreenProps): React.JSX.Element {
  const user = useCurrentUser();
  const { signOut, pendingAction, notice, clearNotice } = useAuth();
  const { conversations, isLoading, error } = useConversations(user.uid);
  const connected = useConnection();
  const notifications = useNotificationStatus();

  const openConversation = useCallback(
    (conversation: ConversationListItem) => {
      navigation.navigate('Chat', { conversationId: conversation.id, conversationType: conversation.type });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ConversationListItem>) => (
      <ConversationItem conversation={item} currentUid={user.uid} onPress={openConversation} />
    ),
    [openConversation, user.uid],
  );

  const pushUnavailable =
    notifications.registration.status === 'unavailable' ? notifications.registration.reason : null;

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Avatar
          uri={user.photoUrl}
          size={44}
          label="Meu perfil"
          onPress={() => navigation.navigate('Profile', { userId: user.uid })}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Conversas</Text>
          <Text style={styles.headerName} numberOfLines={1}>
            {user.name}
          </Text>
        </View>
        <Pressable
          onPress={signOut}
          accessibilityRole="button"
          accessibilityLabel="Sair da conta"
          disabled={pendingAction === 'sign-out'}
          style={({ pressed }) => [styles.logout, pressed ? styles.logoutPressed : null]}>
          <Text style={styles.logoutText}>{pendingAction === 'sign-out' ? 'Saindo...' : 'Sair'}</Text>
        </Pressable>
      </View>

      <View style={styles.banners}>
        {!connected ? (
          <NoticeBanner tone="warning" message="Sem conexão. As mensagens serão sincronizadas quando a rede voltar." />
        ) : null}
        {notice ? <NoticeBanner tone="warning" message={notice} onDismiss={clearNotice} /> : null}
        {pushUnavailable ? (
          <NoticeBanner
            tone="info"
            message={`Notificações indisponíveis: ${pushUnavailable}`}
            actionLabel={notifications.permission === 'denied' ? 'Ajustes' : 'Tentar'}
            onAction={notifications.permission === 'denied' ? notifications.openSettings : notifications.retry}
          />
        ) : null}
        {error ? <ErrorMessage message={error} /> : null}
      </View>

      <View style={styles.actions}>
        <View style={styles.actionItem}>
          <AppButton
            label="Nova conversa"
            icon="👤"
            compact
            onPress={() => navigation.navigate('Users', { mode: 'direct' })}
          />
        </View>
        <View style={styles.actionItem}>
          <AppButton label="Novo grupo" icon="👥" variant="secondary" compact onPress={() => navigation.navigate('GroupForm')} />
        </View>
      </View>

      {isLoading ? (
        <Loading message="Carregando conversas..." />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, conversations.length === 0 ? styles.listEmpty : null]}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={
            <EmptyState
              icon="💬"
              title="Nenhuma conversa ainda"
              description="Toque em “Nova conversa” para falar com alguém ou crie um grupo."
            />
          }
        />
      )}
    </ScreenContainer>
  );
}

function Separator(): React.JSX.Element {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  headerName: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  logout: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  logoutPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  logoutText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  banners: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  actionItem: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  listEmpty: {
    flexGrow: 1,
  },
  separator: {
    height: spacing.sm,
  },
});
