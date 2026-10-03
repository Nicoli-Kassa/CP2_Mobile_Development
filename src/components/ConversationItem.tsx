import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ConversationListItem } from '../hooks/useConversations';
import { colors, fontSize, radius, spacing } from '../theme/theme';
import { formatConversationTime } from '../utils/format';
import { Avatar } from './Avatar';

type ConversationItemProps = {
  conversation: ConversationListItem;
  currentUid: string;
  onPress: (conversation: ConversationListItem) => void;
};

/** Linha da lista de conversas, com selo do tipo (individual/grupo). */
export function ConversationItem({ conversation, currentUid, onPress }: ConversationItemProps): React.JSX.Element {
  const handlePress = useCallback(() => onPress(conversation), [conversation, onPress]);
  const isGroup = conversation.type === 'group';
  const last = conversation.lastMessage;
  const preview = last
    ? `${last.senderId === currentUid ? 'Você: ' : ''}${last.text}`
    : isGroup
      ? `${conversation.memberCount} integrantes`
      : 'Nenhuma mensagem ainda';

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${isGroup ? 'Grupo' : 'Conversa com'} ${conversation.title}`}
      style={({ pressed }) => [styles.container, pressed ? styles.pressed : null]}>
      <Avatar uri={conversation.photoUrl} variant={isGroup ? 'group' : 'user'} label={conversation.title} />
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {conversation.title}
          </Text>
          <View style={[styles.badge, isGroup ? styles.badgeGroup : styles.badgeDirect]}>
            <Text style={[styles.badgeText, isGroup ? styles.badgeTextGroup : styles.badgeTextDirect]}>
              {isGroup ? '👥 Grupo' : '👤 Individual'}
            </Text>
          </View>
        </View>
        <Text style={styles.preview} numberOfLines={1}>
          {preview}
        </Text>
      </View>
      {last ? <Text style={styles.time}>{formatConversationTime(last.createdAt)}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flexShrink: 1,
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeGroup: {
    backgroundColor: colors.primarySoft,
  },
  badgeDirect: {
    backgroundColor: colors.successSoft,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeTextGroup: {
    color: colors.primary,
  },
  badgeTextDirect: {
    color: colors.success,
  },
  preview: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  time: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    alignSelf: 'flex-start',
  },
});
