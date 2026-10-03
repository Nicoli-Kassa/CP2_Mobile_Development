import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, fontSize, radius, spacing } from '../theme/theme';

export type AppButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  icon?: string;
  isLoading?: boolean;
  disabled?: boolean;
  helperText?: string | null;
  compact?: boolean;
};

/** Botão padrão do app, com estados de loading e desabilitado. */
export function AppButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  isLoading = false,
  disabled = false,
  helperText = null,
  compact = false,
}: AppButtonProps): React.JSX.Element {
  const isDisabled = disabled || isLoading;
  const spinnerColor = variant === 'primary' || variant === 'danger' ? colors.textInverted : colors.primary;

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isDisabled, busy: isLoading }}
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }): ViewStyle[] => [
          styles.base,
          compact ? styles.compact : {},
          VARIANT_STYLES[variant],
          pressed && !isDisabled ? styles.pressed : {},
          isDisabled ? styles.disabled : {},
        ]}>
        {isLoading ? (
          <ActivityIndicator color={spinnerColor} />
        ) : (
          <View style={styles.content}>
            {icon ? <Text style={styles.icon}>{icon}</Text> : null}
            <Text style={[styles.label, compact ? styles.labelCompact : null, VARIANT_TEXT_STYLES[variant]]}>
              {label}
            </Text>
          </View>
        )}
      </Pressable>
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  base: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  compact: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    fontSize: fontSize.lg,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  labelCompact: {
    fontSize: fontSize.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
});

const VARIANT_STYLES: Record<AppButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.primarySoft },
  danger: { backgroundColor: colors.danger },
  ghost: { backgroundColor: 'transparent' },
};

const VARIANT_TEXT_STYLES: Record<AppButtonVariant, { color: string }> = {
  primary: { color: colors.textInverted },
  secondary: { color: colors.primary },
  danger: { color: colors.textInverted },
  ghost: { color: colors.primary },
};
