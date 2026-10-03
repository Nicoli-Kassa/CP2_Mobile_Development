import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '../theme/theme';
import type { PublicUser } from '../types/user';
import { Avatar } from './Avatar';

type UserItemProps = {
  user: PublicUser;
  onPress: (user: PublicUser) => void;
  /** Modo seleção: mostra a caixa de marcação. */
  selectable?: boolean;
  selected?: boolean;
  disabled?: boolean;
  subtitle?: string;
};

/** Linha da lista de usuários (iniciar conversa ou escolher integrantes). */
export function UserItem({
  user,
  onPress,
  selectable = false,
  selected = false,
  disabled = false,
  subtitle,
}: UserItemProps): React.JSX.Element {
  const handlePress = useCallback(() => onPress(user), [onPress, user]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole={selectable ? 'checkbox' : 'button'}
      accessibilityState={{ checked: selectable ? selected : undefined, disabled }}
      accessibilityLabel={selectable ? `Selecionar ${user.name}` : `Conversar com ${user.name}`}
      style={({ pressed }) => [
        styles.container,
        selected ? styles.selected : null,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}>
      <Avatar uri={user.photoUrl} label={`Foto de ${user.name}`} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {user.name}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {selectable ? (
        <View style={[styles.checkbox, selected ? styles.checkboxOn : null]}>
          {selected ? <Text style={styles.check}>✓</Text> : null}
        </View>
      ) : (
        <Text style={styles.chevron}>›</Text>
      )}
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
    borderWidth: 1,
    borderColor: 'transparent',
    padding: spacing.md,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  check: {
    color: colors.textInverted,
    fontWeight: '800',
  },
  chevron: {
    color: colors.textMuted,
    fontSize: fontSize.xl,
  },
});
