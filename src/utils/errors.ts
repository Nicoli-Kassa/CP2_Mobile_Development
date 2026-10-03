import { FirebaseError } from 'firebase/app';

/**
 * Tradução de erros para mensagens que o usuário entende.
 *
 * Nenhuma tela mostra o código cru do Firebase nem detalhes internos: as
 * telas chamam `describeError` e exibem o texto devolvido aqui.
 */

/** Erro de configuração do projeto (arquivo ou variável ausente). */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/** Erro de regra de negócio com mensagem já pronta para a interface. */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

/** Erro devolvido pela API online (já com mensagem amigável). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const FIREBASE_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'E-mail inválido.',
  'auth/missing-email': 'Informe o e-mail.',
  'auth/missing-password': 'Informe a senha.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/invalid-login-credentials': 'E-mail ou senha incorretos.',
  'auth/email-already-in-use': 'Este e-mail já está cadastrado. Faça login.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.',
  'auth/network-request-failed': 'Sem conexão com a internet. Verifique a rede e tente novamente.',
  'auth/operation-not-allowed': 'Login por e-mail e senha não está habilitado no Firebase.',
  'auth/requires-recent-login': 'Sua sessão expirou. Faça login novamente.',
  'auth/user-token-expired': 'Sua sessão expirou. Faça login novamente.',
  'auth/invalid-user-token': 'Sua sessão expirou. Faça login novamente.',
  'permission-denied': 'Você não tem permissão para realizar esta ação.',
  'firestore/permission-denied': 'Você não tem permissão para realizar esta ação.',
  unavailable: 'Sem conexão com o Firebase. Verifique a internet e tente novamente.',
  'storage/unauthorized': 'Você não tem permissão para enviar esta imagem.',
  'storage/canceled': 'Envio da imagem cancelado.',
  'storage/retry-limit-exceeded': 'Não foi possível enviar a imagem. Verifique a conexão.',
  'storage/quota-exceeded': 'O armazenamento de imagens atingiu o limite.',
};

function readErrorCode(error: unknown): string | null {
  if (error instanceof FirebaseError) {
    return error.code;
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code } = error as { code: unknown };
    if (typeof code === 'string') {
      return code;
    }
  }
  return null;
}

export function isPermissionDenied(error: unknown): boolean {
  const code = readErrorCode(error) ?? '';
  const message = error instanceof Error ? error.message : '';
  return code.toLowerCase().includes('permission') || message.toUpperCase().includes('PERMISSION_DENIED');
}

/** Converte qualquer erro em uma mensagem legível em português. */
export function describeError(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (error instanceof ConfigurationError || error instanceof AppError || error instanceof ApiError) {
    return error.message;
  }

  const code = readErrorCode(error);
  if (code !== null && FIREBASE_MESSAGES[code]) {
    return FIREBASE_MESSAGES[code];
  }

  if (isPermissionDenied(error)) {
    return FIREBASE_MESSAGES['permission-denied'];
  }

  const raw = `${code ?? ''} ${error instanceof Error ? error.message : ''}`.toUpperCase();
  if (raw.includes('NETWORK') || raw.includes('FAILED TO FETCH') || raw.includes('UNAVAILABLE') || raw.includes('OFFLINE')) {
    return 'Sem conexão com a internet. Verifique a rede e tente novamente.';
  }

  return fallback;
}
