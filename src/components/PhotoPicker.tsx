import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { pickPhoto, type PhotoSource } from '../services/imagePickerService';
import { colors, fontSize, spacing } from '../theme/theme';
import { describeError } from '../utils/errors';
import { AppButton } from './AppButton';
import { Avatar } from './Avatar';

type PhotoPickerProps = {
  /** URI local (recém-escolhida) ou URL remota atual. */
  uri: string | null;
  onChange: (uri: string) => void;
  variant?: 'user' | 'group';
  disabled?: boolean;
  errorText?: string | null;
};

/** Pré-visualização da foto + botões de galeria e câmera. */
export function PhotoPicker({
  uri,
  onChange,
  variant = 'user',
  disabled = false,
  errorText = null,
}: PhotoPickerProps): React.JSX.Element {
  const [pickError, setPickError] = useState<string | null>(null);

  const choose = useCallback(
    async (source: PhotoSource) => {
      setPickError(null);
      try {
        const picked = await pickPhoto(source);
        if (picked) {
          onChange(picked);
        }
      } catch (error) {
        setPickError(describeError(error, 'Não foi possível abrir as fotos.'));
      }
    },
    [onChange],
  );

  const message = pickError ?? errorText;

  return (
    <View style={styles.container}>
      <Avatar uri={uri} size={96} variant={variant} label={variant === 'group' ? 'Foto do grupo' : 'Foto de perfil'} />
      <View style={styles.actions}>
        <AppButton label="Galeria" icon="🖼️" variant="secondary" compact onPress={() => void choose('library')} disabled={disabled} />
        <AppButton label="Câmera" icon="📷" variant="secondary" compact onPress={() => void choose('camera')} disabled={disabled} />
      </View>
      {message ? <Text style={styles.error}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
});
