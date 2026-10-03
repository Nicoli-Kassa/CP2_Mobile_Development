import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '../theme/theme';

type NoticeBannerProps = {
  message: string;
  tone?: 'info' | 'warning' | 'success';
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
};

const TONES = {
  info: { background: colors.primarySoft, text: colors.primaryDark, icon: 'ℹ️' },
  warning: { background: colors.warningSoft, text: colors.warning, icon: '⚠️' },
  success: { background: colors.successSoft, text: colors.success, icon: '✅' },
} as const;

/** Aviso não bloqueante (sem conexão, permissão de push negada, etc.). */
export function NoticeBanner({
  message,
  tone = 'info',
  actionLabel,
  onAction,
  onDismiss,
}: NoticeBannerProps): React.JSX.Element {
  const palette = TONES[tone];
  return (
    <View style={[styles.container, { backgroundColor: palette.background }]} accessibilityRole="alert">
      <Text style={styles.icon}>{palette.icon}</Text>
      <Text style={[styles.message, { color: palette.text }]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}>
          <Text style={[styles.action, { color: palette.text }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
      {onDismiss ? (
        <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Fechar aviso" hitSlop={8}>
          <Text style={[styles.action, { color: palette.text }]}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  icon: {
    fontSize: fontSize.sm,
  },
  message: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  action: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
