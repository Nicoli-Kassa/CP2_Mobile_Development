import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '../theme/theme';
import type { ChatMessage } from '../types/chat';
import { formatMessageTime } from '../utils/format';

type ChatMessageBubbleProps = {
  message: ChatMessage;
  /** `true` quando a mensagem foi enviada pelo usuário logado. */
  isMine: boolean;
  /** Nome do autor — exibido em grupos. */
  authorName: string | null;
  /** Nome do integrante escolhido como destinatário, quando houver. */
  targetName: string | null;
  /** A mensagem menciona ou é direcionada ao usuário logado. */
  addressedToMe: boolean;
};

/** Bolha da mensagem, com visual diferente para enviadas e recebidas. */
export function ChatMessageBubble({
  message,
  isMine,
  authorName,
  targetName,
  addressedToMe,
}: ChatMessageBubbleProps): React.JSX.Element {
  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      <View
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleTheirs,
          addressedToMe && !isMine ? styles.bubbleAddressed : null,
        ]}>
        {authorName && !isMine ? <Text style={styles.author}>{authorName}</Text> : null}
        {targetName ? (
          <Text style={[styles.target, isMine ? styles.metaMine : styles.metaTheirs]}>➜ Para {targetName}</Text>
        ) : null}
        <Text style={[styles.text, isMine ? styles.textMine : styles.textTheirs]}>{message.text}</Text>
        <Text style={[styles.time, isMine ? styles.metaMine : styles.metaTheirs]}>
          {formatMessageTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  rowTheirs: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    gap: 2,
  },
  bubbleMine: {
    backgroundColor: colors.bubbleSent,
    borderBottomRightRadius: radius.sm / 2,
  },
  bubbleTheirs: {
    backgroundColor: colors.bubbleReceived,
    borderBottomLeftRadius: radius.sm / 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleAddressed: {
    backgroundColor: colors.mention,
    borderColor: colors.warning,
  },
  author: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  target: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  text: {
    fontSize: fontSize.md,
    lineHeight: 21,
  },
  textMine: {
    color: colors.textInverted,
  },
  textTheirs: {
    color: colors.text,
  },
  time: {
    fontSize: 10,
    alignSelf: 'flex-end',
  },
  metaMine: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  metaTheirs: {
    color: colors.textMuted,
  },
});
