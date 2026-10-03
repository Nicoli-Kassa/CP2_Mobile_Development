import * as ImagePicker from 'expo-image-picker';

import { AppError } from '../utils/errors';

/**
 * Seleção de fotos da galeria ou da câmera, com pedido de permissão.
 * Devolve a URI local da imagem ou `null` se a pessoa cancelar.
 */

export type PhotoSource = 'library' | 'camera';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.6,
};

export async function pickPhoto(source: PhotoSource): Promise<string | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new AppError(
      source === 'camera'
        ? 'Permissão da câmera negada. Libere o acesso nas configurações do aparelho.'
        : 'Permissão da galeria negada. Libere o acesso nas configurações do aparelho.',
    );
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
      : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);

  if (result.canceled || result.assets.length === 0) {
    return null;
  }
  return result.assets[0].uri;
}
