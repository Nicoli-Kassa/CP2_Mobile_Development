import { useCallback, useEffect, useState } from 'react';

import { fetchOwnProfile, fetchSharedProfile } from '../services/userService';
import type { ChatUser } from '../types/user';
import { describeError } from '../utils/errors';

export type UserProfileState = {
  profile: ChatUser | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
};

/**
 * Perfil completo: o próprio vem do Firestore; o de outra pessoa vem da API,
 * que só libera com conversa ou grupo em comum.
 */
export function useUserProfile(userId: string, currentUid: string): UserProfileState {
  const [profile, setProfile] = useState<ChatUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    const load = userId === currentUid ? fetchOwnProfile(userId) : fetchSharedProfile(userId);
    load
      .then((result) => {
        if (active) {
          setProfile(result);
          setError(result ? null : 'Perfil não encontrado.');
        }
      })
      .catch((failure: unknown) => {
        if (active) {
          setError(describeError(failure, 'Não foi possível carregar o perfil.'));
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [userId, currentUid, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { profile, isLoading, error, retry };
}
