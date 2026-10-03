import type { PublicUser } from '../types/user';

/** Regras da lista de usuários. */

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Remove o próprio usuário (ninguém conversa consigo mesmo), aplica a busca
 * por nome e ordena alfabeticamente — sem mutar a lista recebida.
 */
export function filterSelectableUsers(
  currentUid: string,
  users: readonly PublicUser[],
  search: string,
): PublicUser[] {
  const term = normalize(search);
  return users
    .filter((user) => user.uid !== currentUid)
    .filter((user) => term.length === 0 || normalize(user.name).includes(term))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
