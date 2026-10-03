import Constants from 'expo-constants';

import { isRecord } from '../utils/parse';

/**
 * Configurações públicas do app lidas de `app.json` → `expo.extra`.
 *
 * A URL da API fica versionada no `app.json` para que quem for corrigir não
 * precise configurar nada. `EXPO_PUBLIC_API_URL` (arquivo `.env`) pode
 * sobrescrever o valor durante o desenvolvimento.
 */

function readExtra(key: string): string | null {
  const extra: unknown = Constants.expoConfig?.extra;
  if (!isRecord(extra)) {
    return null;
  }
  const value = extra[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readEasProjectId(): string | null {
  const extra: unknown = Constants.expoConfig?.extra;
  const eas = isRecord(extra) ? extra.eas : undefined;
  if (isRecord(eas) && typeof eas.projectId === 'string' && eas.projectId.length > 0) {
    return eas.projectId;
  }
  return Constants.easConfig?.projectId ?? null;
}

const envApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

/** URL pública (HTTPS) da API de notificações, sem barra final. */
export const API_URL: string | null = (envApiUrl && envApiUrl.length > 0 ? envApiUrl : readExtra('apiUrl'))
  ?.replace(/\/+$/, '') ?? null;

/**
 * Envio de fotos (perfil e grupo) para o Firebase Storage.
 * Desligado enquanto o Storage não estiver ativo no projeto: o app esconde o
 * seletor de foto e todos usam o avatar padrão. Para religar, defina
 * `expo.extra.photoUploadEnabled: true` no app.json.
 */
export const PHOTO_UPLOAD_ENABLED: boolean = (() => {
  const extra: unknown = Constants.expoConfig?.extra;
  return isRecord(extra) && extra.photoUploadEnabled === true;
})();

/** ID do projeto EAS, necessário para gerar o Expo Push Token. */
export const EAS_PROJECT_ID: string | null = readEasProjectId();
