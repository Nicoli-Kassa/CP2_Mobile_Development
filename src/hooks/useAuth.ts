import { useAuthContext, type AuthContextValue } from '../contexts/AuthContext';
import type { ChatUser } from '../types/user';

/** Estado de autenticação usado pelas telas. */
export function useAuth(): AuthContextValue {
  return useAuthContext();
}

/**
 * Usuário autenticado para telas que só existem com sessão ativa.
 * O navegador só monta essas telas quando `status === 'authenticated'`.
 */
export function useCurrentUser(): ChatUser {
  const { user } = useAuthContext();
  if (!user) {
    throw new Error('useCurrentUser usado fora de uma sessão autenticada.');
  }
  return user;
}
