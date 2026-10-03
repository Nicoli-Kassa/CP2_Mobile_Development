import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../config/appConfig';
import { AppError, ConfigurationError } from '../utils/errors';
import { isRecord } from '../utils/parse';

/**
 * Upload das fotos para o Cloudinary (upload *unsigned* com upload preset).
 *
 * Só a URL final (`secure_url`) é gravada no Firestore — nunca a imagem
 * em Base64.
 */

function uploadEndpoint(): { url: string; preset: string } {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new ConfigurationError(
      'Envio de fotos não configurado: defina cloudinaryCloudName e cloudinaryUploadPreset no app.json.',
    );
  }
  return {
    url: `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    preset: CLOUDINARY_UPLOAD_PRESET,
  };
}

async function appendFile(form: FormData, localUri: string, fileName: string): Promise<void> {
  if (Platform.OS === 'web') {
    // Na web o FormData precisa de um Blob de verdade.
    const blob = await (await fetch(localUri)).blob();
    form.append('file', blob, fileName);
    return;
  }
  // O fetch do Expo (SDK 57+) não aceita `{ uri, name, type }`: precisa de um Blob/File.
  form.append('file', new File(localUri) as unknown as Blob, fileName);
}

async function uploadImage(folder: string, localUri: string): Promise<string> {
  const { url, preset } = uploadEndpoint();

  let response: Response;
  try {
    const form = new FormData();
    await appendFile(form, localUri, 'photo.jpg');
    form.append('upload_preset', preset);
    form.append('folder', folder);
    response = await fetch(url, { method: 'POST', body: form });
  } catch (error) {
    const detail = error instanceof Error ? error.message.replace(/\s+/g, ' ').trim().slice(0, 120) : '';
    throw new AppError(`Não foi possível enviar a imagem${detail ? ` (${detail})` : ''}.`);
  }
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok || !isRecord(body) || typeof body.secure_url !== 'string') {
    const reason = isRecord(body) && isRecord(body.error) && typeof body.error.message === 'string' ? body.error.message : '';
    throw new AppError(`Não foi possível enviar a imagem${reason ? ` (${reason})` : ''}. Tente novamente.`);
  }
  return body.secure_url;
}

export function uploadProfilePhoto(uid: string, localUri: string): Promise<string> {
  return uploadImage(`cp2chat/users/${uid}`, localUri);
}

export function uploadGroupPhoto(groupId: string, localUri: string): Promise<string> {
  return uploadImage(`cp2chat/groups/${groupId}`, localUri);
}
