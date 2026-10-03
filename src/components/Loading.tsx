import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, spacing } from '../theme/theme';

type LoadingProps = {
  message?: string;
  /** `full` ocupa a tela inteira; `inline` fica no meio do conteúdo. */
  variant?: 'full' | 'inline';
};

/** Indicador de carregamento reutilizado em todas as telas. */
export function Loading({ message, variant = 'inline' }: LoadingProps): React.JSX.Element {
  return (
    <View style={[styles.container, variant === 'full' && styles.full]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  full: {
    flex: 1,
    backgroundColor: colors.background,
  },
  message: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
});
