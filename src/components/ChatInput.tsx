import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { SendOptions } from '../hooks/useChat';
import { colors, fontSize, radius, spacing } from '../theme/theme';
import { MAX_MESSAGE_LENGTH } from '../utils/validation';

export type MentionableMember = { uid: string; name: string };

type ChatInputProps = {
  onSend: (text: string, options: SendOptions) => Promise<boolean>;
  isSending: boolean;
  disabled?: boolean;
  /** Integrantes que podem ser mencionados/escolhidos (somente em grupos). */
  members?: readonly MentionableMember[];
};

type Panel = 'mention' | 'target' | null;

/**
 * Campo de digitação + botão de envio.
 * Em grupos: "@" menciona um integrante e "Para" direciona a mensagem a ele.
 */
export function ChatInput({ onSend, isSending, disabled = false, members = [] }: ChatInputProps): React.JSX.Element {
  const [text, setText] = useState('');
  const [mentions, setMentions] = useState<Record<string, string>>({});
  const [targetId, setTargetId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);

  const isGroup = members.length > 0;
  const canSend = text.trim().length > 0 && !isSending && !disabled;

  const targetName = useMemo(
    () => members.find((member) => member.uid === targetId)?.name ?? null,
    [members, targetId],
  );

  /** Só vale a menção cujo `@Nome` continua no texto. */
  const activeMentionIds = useMemo(
    () => Object.entries(mentions).filter(([, name]) => text.includes(`@${name}`)).map(([uid]) => uid),
    [mentions, text],
  );

  const choose = useCallback(
    (member: MentionableMember) => {
      if (panel === 'mention') {
        setText((current) => `${current}${current.length > 0 && !current.endsWith(' ') ? ' ' : ''}@${member.name} `);
        setMentions((current) => ({ ...current, [member.uid]: member.name }));
      } else {
        setTargetId(member.uid);
      }
      setPanel(null);
    },
    [panel],
  );

  const handleSend = useCallback(async () => {
    if (!canSend) {
      return;
    }
    const sent = await onSend(text, {
      target: targetId ? { type: 'member', memberId: targetId } : { type: 'conversation' },
      mentionedUserIds: activeMentionIds,
    });
    // O campo só é limpo quando o Firebase confirma a gravação.
    if (sent) {
      setText('');
      setMentions({});
      setTargetId(null);
    }
  }, [activeMentionIds, canSend, onSend, targetId, text]);

  return (
    <View style={styles.wrapper}>
      {panel ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>
            {panel === 'mention' ? 'Mencionar integrante' : 'Direcionar mensagem para'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {members.map((member) => (
              <Pressable key={member.uid} onPress={() => choose(member)} style={styles.chip} accessibilityRole="button">
                <Text style={styles.chipText}>{member.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {isGroup ? (
        <View style={styles.toolbar}>
          <Pressable
            onPress={() => setPanel(panel === 'mention' ? null : 'mention')}
            style={[styles.tool, panel === 'mention' ? styles.toolActive : null]}
            accessibilityRole="button"
            accessibilityLabel="Mencionar integrante">
            <Text style={styles.toolText}>@ Mencionar</Text>
          </Pressable>
          <Pressable
            onPress={() => setPanel(panel === 'target' ? null : 'target')}
            style={[styles.tool, panel === 'target' || targetName ? styles.toolActive : null]}
            accessibilityRole="button"
            accessibilityLabel="Escolher destinatário">
            <Text style={styles.toolText}>Para: {targetName ?? 'Todos'}</Text>
          </Pressable>
          {targetName ? (
            <Pressable onPress={() => setTargetId(null)} hitSlop={8} accessibilityLabel="Enviar para todos">
              <Text style={styles.clear}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.container}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={disabled ? 'Envio indisponível' : 'Digite uma mensagem'}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={MAX_MESSAGE_LENGTH}
          editable={!disabled}
          accessibilityLabel="Campo de mensagem"
        />
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensagem"
          accessibilityState={{ disabled: !canSend, busy: isSending }}
          style={({ pressed }) => [
            styles.sendButton,
            !canSend ? styles.sendButtonDisabled : null,
            pressed && canSend ? styles.sendButtonPressed : null,
          ]}>
          {isSending ? (
            <ActivityIndicator color={colors.textInverted} size="small" />
          ) : (
            <Text style={styles.sendIcon}>➤</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  panel: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  panelTitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  chips: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  tool: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  toolActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  toolText: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  clear: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 46,
    color: colors.text,
    fontSize: fontSize.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  sendButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: colors.primary,
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
  sendButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  sendIcon: {
    color: colors.textInverted,
    fontSize: fontSize.lg,
  },
});
