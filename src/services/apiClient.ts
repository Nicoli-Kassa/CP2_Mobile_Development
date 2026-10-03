import { API_URL } from '../config/appConfig';
import { ApiError, ConfigurationError } from '../utils/errors';
import { isRecord } from '../utils/parse';
import { getFirebaseAuth } from './firebase';

/**
 * Cliente da API online.
 *
 * Toda chamada leva `Authorization: Bearer <Firebase ID Token>`; a API
 * valida o token com o Admin SDK. Nenhuma credencial administrativa fica no app.
 */

// O plano gratuito do Render "dorme" sem uso e leva até ~50 s para acordar;
// o limite cobre essa primeira chamada em vez de desistir dela.
const REQUEST_TIMEOUT_MS = 60000;

function friendlyMessage(status: number, body: unknown): string {
  const serverMessage = isRecord(body) && typeof body.error === 'string' ? body.error : null;
  if (status === 401) {
    return 'Sua sessão expirou. Faça login novamente.';
  }
  if (status >= 500) {
    return 'O servidor de notificações está indisponível no momento.';
  }
  return serverMessage ?? 'Não foi possível concluir a operação.';
}

export async function apiRequest(path: string, init: { method: 'GET' | 'POST'; body?: object }): Promise<unknown> {
  if (!API_URL) {
    throw new ConfigurationError('URL da API não configurada (app.json → expo.extra.apiUrl).');
  }
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new ApiError(401, 'Sua sessão expirou. Faça login novamente.');
  }

  const idToken = await user.getIdToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: init.method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });

    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(response.status, friendlyMessage(response.status, body));
    }
    return body;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, 'Não foi possível falar com o servidor. Verifique sua conexão.');
  } finally {
    clearTimeout(timeout);
  }
}
