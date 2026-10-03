import { useCallback, useEffect, useMemo, useState } from 'react';

import { observeUsers, observeUsersByIds } from '../services/userService';
import type { PublicUser } from '../types/user';
import { filterSelectableUsers } from '../utils/chatRules';
import { describeError } from '../utils/errors';

export type UsersState = {
  users: PublicUser[];
  totalUsers: number;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
};

/**
 * Usuários cadastrados, sem o próprio usuário, filtrados pela busca.
 * O `useMemo` refaz o filtro só quando a lista ou o termo mudam.
 */
export function useUsers(currentUid: string, search: string): UsersState {
  const [allUsers, setAllUsers] = useState<PublicUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    return observeUsers(
      (list) => {
        setAllUsers(list);
        setIsLoading(false);
      },
      (failure) => {
        setError(describeError(failure, 'Não foi possível carregar os usuários.'));
        setIsLoading(false);
      },
    );
  }, [attempt]);

  const users = useMemo(() => filterSelectableUsers(currentUid, allUsers, search), [allUsers, currentUid, search]);
  const totalUsers = useMemo(() => allUsers.filter((user) => user.uid !== currentUid).length, [allUsers, currentUid]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { users, totalUsers, isLoading, error, retry };
}

/** Nomes e fotos de um conjunto de usuários, indexados por `uid`. */
export function useUserDirectory(uids: readonly string[]): Record<string, PublicUser> {
  const [directory, setDirectory] = useState<Record<string, PublicUser>>({});

  // Chave estável: só reassina quando o conjunto de uids muda de fato.
  const key = useMemo(() => [...new Set(uids)].sort().join(','), [uids]);

  useEffect(() => {
    const ids = key.length > 0 ? key.split(',') : [];
    return observeUsersByIds(ids, setDirectory, () => setDirectory({}));
  }, [key]);

  return directory;
}
