import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  isPasswordUser,
  observeAuthState,
  registerWithEmail,
  signInWithEmail as signInWithEmailService,
  signOutUser,
} from '../services/authService';
import { disableDevice } from '../services/notificationService';
import { fetchOwnProfile } from '../services/userService';
import type { ChatUser, RegisterInput } from '../types/user';
import { withTimeout } from '../utils/async';
import { describeError } from '../utils/errors';

/**
 * Estado global de autenticação.
 *
 * A única fonte de verdade é o `onAuthStateChanged` do Firebase: as ações
 * disparam o Firebase e o listener atualiza o estado. No logout o usuário
 * sai do estado, a navegação volta ao login e as telas protegidas (com seus
 * listeners) são desmontadas.
 */

export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated';
export type AuthAction = 'sign-in' | 'sign-up' | 'sign-out';

export type AuthContextValue = {
  status: AuthStatus;
  user: ChatUser | null;
  pendingAction: AuthAction | null;
  isBusy: boolean;
  error: string | null;
  notice: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  clearNotice: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = { children: ReactNode };

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [status, setStatus] = useState<AuthStatus>('initializing');
  const [user, setUser] = useState<ChatUser | null>(null);
  const [pendingAction, setPendingAction] = useState<AuthAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /** Durante o cadastro o perfil ainda não existe; `register` conclui a sessão. */
  const registeringRef = useRef(false);

  useEffect(() => {
    let active = true;

    const unsubscribe = observeAuthState((firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setStatus('unauthenticated');
        return;
      }
      if (!isPasswordUser(firebaseUser)) {
        setError('Somente contas de e-mail e senha podem usar o chat.');
        void signOutUser();
        return;
      }
      if (registeringRef.current) {
        return;
      }

      setStatus('initializing');
      fetchOwnProfile(firebaseUser.uid)
        .then((profile) => {
          if (!active) {
            return;
          }
          if (!profile) {
            setError('Perfil não encontrado. Crie sua conta novamente.');
            void signOutUser();
            return;
          }
          setUser(profile);
          setStatus('authenticated');
        })
        .catch((failure: unknown) => {
          if (!active) {
            return;
          }
          setError(describeError(failure, 'Não foi possível carregar seu perfil.'));
          void signOutUser();
        });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const runAction = useCallback(async (action: AuthAction, task: () => Promise<void>) => {
    setError(null);
    setPendingAction(action);
    try {
      await task();
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setPendingAction(null);
    }
  }, []);

  const signIn = useCallback(
    (email: string, password: string) => runAction('sign-in', () => signInWithEmailService(email, password)),
    [runAction],
  );

  const register = useCallback(
    (input: RegisterInput) =>
      runAction('sign-up', async () => {
        registeringRef.current = true;
        try {
          const result = await registerWithEmail(input);
          setUser(result.user);
          setNotice(result.warning);
          setStatus('authenticated');
        } finally {
          registeringRef.current = false;
        }
      }),
    [runAction],
  );

  const signOut = useCallback(
    () =>
      runAction('sign-out', async () => {
        if (user) {
          // Falha ou demora aqui não impede o logout (ex.: sem internet).
          await withTimeout(disableDevice(user.uid), 5000, 'timeout').catch(() => undefined);
        }
        await signOutUser();
      }),
    [runAction, user],
  );

  const clearError = useCallback(() => setError(null), []);
  const clearNotice = useCallback(() => setNotice(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      pendingAction,
      isBusy: pendingAction !== null,
      error,
      notice,
      signIn,
      register,
      signOut,
      clearError,
      clearNotice,
    }),
    [status, user, pendingAction, error, notice, signIn, register, signOut, clearError, clearNotice],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext precisa estar dentro de <AuthProvider>.');
  }
  return context;
}
