import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, type ImageSourcePropType } from 'react-native';

import { colors } from '../theme/theme';

const DEFAULT_USER: ImageSourcePropType = require('../../assets/default-avatar.png');
const DEFAULT_GROUP: ImageSourcePropType = require('../../assets/default-group.png');

type AvatarProps = {
  uri: string | null | undefined;
  size?: number;
  variant?: 'user' | 'group';
  /** Texto lido por leitores de tela. */
  label: string;
  onPress?: () => void;
};

/**
 * Foto de perfil ou de grupo. Mostra a imagem padrão quando não há foto
 * ou quando ela falha ao carregar.
 */
export function Avatar({ uri, size = 48, variant = 'user', label, onPress }: AvatarProps): React.JSX.Element {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const fallback = variant === 'group' ? DEFAULT_GROUP : DEFAULT_USER;
  const source: ImageSourcePropType = uri && !failed ? { uri } : fallback;
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  const image = (
    <Image
      source={source}
      style={[styles.image, dimension]}
      onError={() => setFailed(true)}
      accessibilityLabel={label}
    />
  );

  if (!onPress) {
    return image;
  }
  return (
    <Pressable onPress={onPress} accessibilityRole="imagebutton" accessibilityLabel={label} hitSlop={6}>
      {image}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.primarySoft,
  },
});
