import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '../theme/theme';

type ErrorMessageProps = {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryLabel?: string;
};

/** Faixa de erro com ações opcionais de "tentar de novo" e "fechar". */
export function ErrorMessage({
  message,
  onRetry,
  onDismiss,
  retryLabel = 'Tentar novamente',
}: ErrorMessageProps): React.JSX.Element {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.icon}>⚠️</Text>
      <View style={styles.body}>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          {onRetry ? (
            <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.action}>{retryLabel}</Text>
            </Pressable>
          ) : null}
          {onDismiss ? (
            <Pressable onPress={onDismiss} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.action}>Fechar</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  icon: {
    fontSize: fontSize.md,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  message: {
    color: colors.danger,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  action: {
    color: colors.danger,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
