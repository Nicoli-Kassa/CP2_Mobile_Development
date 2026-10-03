import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '../theme/theme';
import type { NotificationPolicy } from '../types/group';
import { NOTIFICATION_POLICIES } from '../utils/parse';

export const POLICY_INFO: Record<NotificationPolicy, { title: string; description: string }> = {
  all_group_messages: {
    title: 'Todas as mensagens',
    description: 'Todos os integrantes, menos quem enviou, recebem push.',
  },
  mentioned_members: {
    title: 'Somente mencionados',
    description: 'Só quem for mencionado (@) ou escolhido como destinatário recebe push.',
  },
  direct_messages_only: {
    title: 'Só conversas individuais',
    description: 'Mensagens do grupo não geram push; apenas conversas individuais notificam.',
  },
  disabled: {
    title: 'Desativadas',
    description: 'Nenhuma mensagem deste grupo gera push.',
  },
};

type PolicySelectorProps = {
  value: NotificationPolicy;
  onChange: (policy: NotificationPolicy) => void;
  disabled?: boolean;
};

/** Escolha da política de notificações do grupo. */
export function PolicySelector({ value, onChange, disabled = false }: PolicySelectorProps): React.JSX.Element {
  return (
    <View style={styles.container} accessibilityRole="radiogroup">
      {NOTIFICATION_POLICIES.map((policy) => {
        const selected = policy === value;
        return (
          <Pressable
            key={policy}
            onPress={() => onChange(policy)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
            style={[styles.option, selected ? styles.optionSelected : null, disabled ? styles.disabled : null]}>
            <View style={[styles.radio, selected ? styles.radioOn : null]} />
            <View style={styles.texts}>
              <Text style={styles.title}>{POLICY_INFO[policy].title}</Text>
              <Text style={styles.description}>{POLICY_INFO[policy].description}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  disabled: {
    opacity: 0.6,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  description: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
});
