import { useCallback, useEffect, useState } from 'react';

import {
  addGroupMembers,
  observeGroup,
  observeUserGroups,
  removeGroupMember,
  syncGroupMembers,
  updateGroupSettings,
} from '../services/groupService';
import type { ChatGroup, GroupSettingsInput } from '../types/group';
import { describeError, isPermissionDenied } from '../utils/errors';

/** Grupos do usuário em tempo real (lista de conversas). */
export function useUserGroups(uid: string): { groups: ChatGroup[]; isLoading: boolean; error: string | null } {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    return observeUserGroups(
      uid,
      (list) => {
        setGroups(list);
        setError(null);
        setIsLoading(false);
      },
      (failure) => {
        setError(describeError(failure, 'Não foi possível carregar os grupos.'));
        setIsLoading(false);
      },
    );
  }, [uid]);

  return { groups, isLoading, error };
}

export type GroupState = {
  group: ChatGroup | null;
  isLoading: boolean;
  error: string | null;
  /** O usuário não é (mais) integrante do grupo. */
  notMember: boolean;
};

/** Um grupo em tempo real — reage na hora a remoções, novo limite, nova política. */
export function useGroup(groupId: string | null, uid: string): GroupState {
  const [group, setGroup] = useState<ChatGroup | null>(null);
  const [isLoading, setIsLoading] = useState(groupId !== null);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!groupId) {
      setGroup(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setDenied(false);
    return observeGroup(
      groupId,
      (next) => {
        setGroup(next);
        setError(next ? null : 'Este grupo não existe mais.');
        setIsLoading(false);
      },
      (failure) => {
        // As regras negam a leitura para quem foi removido do grupo.
        setDenied(isPermissionDenied(failure));
        setError(
          isPermissionDenied(failure)
            ? 'Você não faz mais parte deste grupo.'
            : describeError(failure, 'Não foi possível carregar o grupo.'),
        );
        setGroup(null);
        setIsLoading(false);
      },
    );
  }, [groupId]);

  const notMember = denied || (group !== null && !group.memberIds.includes(uid));
  return { group, isLoading, error, notMember };
}

export type GroupActions = {
  isSaving: boolean;
  actionError: string | null;
  clearActionError: () => void;
  saveSettings: (input: GroupSettingsInput) => Promise<boolean>;
  addMembers: (memberIds: string[]) => Promise<boolean>;
  removeMember: (memberId: string) => Promise<boolean>;
  resync: () => Promise<boolean>;
};

/** Ações do proprietário sobre um grupo existente. */
export function useGroupActions(groupId: string | null, uid: string): GroupActions {
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = useCallback(
    async (task: (id: string) => Promise<void>, syncMembers: boolean): Promise<boolean> => {
      if (!groupId) {
        return false;
      }
      setIsSaving(true);
      setActionError(null);
      try {
        await task(groupId);
      } catch (failure) {
        setActionError(describeError(failure, 'Não foi possível atualizar o grupo.'));
        setIsSaving(false);
        return false;
      }
      if (syncMembers) {
        try {
          await syncGroupMembers(groupId);
        } catch (failure) {
          setActionError(
            `Integrantes salvos, mas o acesso às mensagens não foi sincronizado: ${describeError(failure)} Toque em "Sincronizar acesso".`,
          );
          setIsSaving(false);
          return false;
        }
      }
      setIsSaving(false);
      return true;
    },
    [groupId],
  );

  const saveSettings = useCallback(
    (input: GroupSettingsInput) => run((id) => updateGroupSettings(id, uid, input), false),
    [run, uid],
  );
  const addMembers = useCallback(
    (memberIds: string[]) => run((id) => addGroupMembers(id, uid, memberIds), true),
    [run, uid],
  );
  const removeMember = useCallback(
    (memberId: string) => run((id) => removeGroupMember(id, uid, memberId), true),
    [run, uid],
  );
  const resync = useCallback(() => run(async () => undefined, true), [run]);
  const clearActionError = useCallback(() => setActionError(null), []);

  return { isSaving, actionError, clearActionError, saveSettings, addMembers, removeMember, resync };
}
