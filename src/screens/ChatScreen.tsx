import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Avatar } from '../components/Avatar';
import { ChatInput, type MentionableMember } from '../components/ChatInput';
import { ChatMessageBubble } from '../components/ChatMessageBubble';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { KeyboardAvoidingContainer } from '../components/KeyboardAvoidingContainer';
import { Loading } from '../components/Loading';
import { NoticeBanner } from '../components/NoticeBanner';
import { POLICY_INFO } from '../components/PolicySelector';
import { ScreenContainer } from '../components/ScreenContainer';
import { useCurrentUser } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useConnection } from '../hooks/useConnection';
import { useUserDirectory } from '../hooks/useContacts';
import { useGroup } from '../hooks/useGroups';
import { colors, fontSize, spacing } from '../theme/theme';
import type { ChatMessage } from '../types/chat';
import type { AppStackParamList } from '../types/navigation';
import { otherParticipant } from '../utils/conversation';
import { pluralize } from '../utils/format';

type ChatScreenProps = NativeStackScreenProps<AppStackParamList, 'Chat'>;

/** Conversa individual ou em grupo, com atualização em tempo real. */
export function ChatScreen({ route, navigation }: ChatScreenProps): React.JSX.Element {
  const { conversationId, conversationType } = route.params;
  const user = useCurrentUser();
  const isGroup = conversationType === 'group';
  const connected = useConnection();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const otherUid = useMemo(
    () => (isGroup ? null : otherParticipant(conversationId, user.uid)),
    [conversationId, isGroup, user.uid],
  );
  const { group, isLoading: groupLoading, error: groupError, notMember } = useGroup(
    isGroup ? conversationId : null,
    user.uid,
  );

  const chat = useChat(conversationId, conversationType, user.uid);
  const { messages } = chat;

  // Nomes: integrantes atuais + autores antigos (ex.: quem já saiu do grupo).
  const directoryIds = useMemo(() => {
    if (otherUid) {
      return [otherUid];
    }
    return [...(group?.memberIds ?? []), ...messages.map((message) => message.senderId)];
  }, [group, messages, otherUid]);
  const directory = useUserDirectory(directoryIds);

  const title = isGroup ? (group?.name ?? 'Grupo') : (otherUid ? directory[otherUid]?.name : null) ?? 'Conversa';
  const photoUrl = isGroup ? (group?.photoUrl ?? '') : otherUid ? (directory[otherUid]?.photoUrl ?? '') : '';
  const subtitle = isGroup
    ? group
      ? `${pluralize(group.memberIds.length, 'integrante', 'integrantes')} · Push: ${POLICY_INFO[group.notificationPolicy].title}`
      : ''
    : 'Toque na foto para ver o perfil';

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const mentionable = useMemo<MentionableMember[]>(
    () =>
      (group?.memberIds ?? [])
        .filter((id) => id !== user.uid)
        .map((id) => ({ uid: id, name: directory[id]?.name ?? 'Integrante' })),
    [directory, group, user.uid],
  );

  const openHeader = useCallback(() => {
    if (isGroup) {
      navigation.navigate('GroupMembers', { groupId: conversationId });
    } else if (otherUid) {
      navigation.navigate('Profile', { userId: otherUid });
    }
  }, [conversationId, isGroup, navigation, otherUid]);

  const scrollToEnd = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(scrollToEnd, 80);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [messages.length, scrollToEnd]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ChatMessage>) => {
      const targetId = item.target.type === 'member' ? item.target.memberId : null;
      return (
        <ChatMessageBubble
          message={item}
          isMine={item.senderId === user.uid}
          authorName={isGroup ? (directory[item.senderId]?.name ?? 'Ex-integrante') : null}
          targetName={targetId ? (targetId === user.uid ? 'você' : (directory[targetId]?.name ?? 'integrante')) : null}
          addressedToMe={item.mentionedUserIds.includes(user.uid) || targetId === user.uid}
        />
      );
    },
    [directory, isGroup, user.uid],
  );

  const blocked = isGroup && (notMember || (!groupLoading && !group));
  const inputDisabled = blocked || chat.accessDenied;

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <Pressable onPress={openHeader} style={styles.header} accessibilityRole="button">
        <Avatar
          uri={photoUrl}
          size={42}
          variant={isGroup ? 'group' : 'user'}
          label={isGroup ? 'Ver integrantes do grupo' : `Ver perfil de ${title}`}
          onPress={openHeader}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </Pressable>

      <KeyboardAvoidingContainer>
        <View style={styles.banners}>
          {!connected ? <NoticeBanner tone="warning" message="Sem conexão. Tentando reconectar..." /> : null}
          {blocked ? (
            <ErrorMessage message={groupError ?? 'Você não faz mais parte deste grupo.'} />
          ) : chat.error ? (
            <ErrorMessage message={chat.error} onRetry={chat.retry} />
          ) : null}
        </View>

        {chat.isLoading && !chat.error ? (
          <Loading message="Carregando mensagens..." />
        ) : (
          <FlatList
            ref={listRef}
            data={blocked ? [] : messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={[styles.list, messages.length === 0 ? styles.listEmpty : null]}
            onContentSizeChange={messages.length > 0 ? scrollToEnd : undefined}
            ListEmptyComponent={
              blocked ? null : (
                <EmptyState
                  icon="💬"
                  title="Nenhuma mensagem ainda"
                  description="Envie a primeira mensagem. Ela aparece para todos na hora."
                />
              )
            }
          />
        )}

        <View style={styles.banners}>
          {chat.sendError ? <ErrorMessage message={chat.sendError} onDismiss={chat.dismissSendError} /> : null}
          {chat.pushWarning ? (
            <NoticeBanner tone="warning" message={chat.pushWarning} onDismiss={chat.dismissPushWarning} />
          ) : null}
        </View>

        <ChatInput
          onSend={chat.send}
          isSending={chat.isSending}
          disabled={inputDisabled}
          members={isGroup ? mentionable : []}
        />
      </KeyboardAvoidingContainer>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  banners: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  list: {
    padding: spacing.lg,
  },
  listEmpty: {
    flexGrow: 1,
  },
});
