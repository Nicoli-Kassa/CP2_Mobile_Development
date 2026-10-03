import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '../theme/theme';
import { Avatar } from './Avatar';

type GroupMemberItemProps = {
  name: string;
  photoUrl: string;
  isOwner: boolean;
  isCurrentUser: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
};

/** Integrante na lista do grupo, com ação opcional de remover (proprietário). */
export function GroupMemberItem({
  name,
  photoUrl,
  isOwner,
  isCurrentUser,
  onPress,
  onRemove,
  disabled = false,
}: GroupMemberItemProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver perfil de ${name}`}
      style={({ pressed }) => [styles.container, pressed && onPress ? styles.pressed : null]}>
      <Avatar uri={photoUrl} size={44} label={`Foto de ${name}`} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
          {isCurrentUser ? ' (você)' : ''}
        </Text>
        {isOwner ? <Text style={styles.owner}>Proprietário</Text> : null}
      </View>
      {onRemove ? (
        <Pressable
          onPress={onRemove}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Remover ${name} do grupo`}
          hitSlop={8}
          style={[styles.remove, disabled ? styles.removeDisabled : null]}>
          <Text style={styles.removeText}>Remover</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  owner: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  remove: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  removeDisabled: {
    opacity: 0.5,
  },
  removeText: {
    color: colors.danger,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});
