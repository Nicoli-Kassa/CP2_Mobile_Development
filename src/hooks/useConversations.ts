import { useEffect, useMemo, useState } from 'react';

import { observeDirectConversations, observeLastMessage } from '../services/chatService';
import type { ChatMessage, ConversationSummary, DirectConversationRecord } from '../types/chat';
import { describeError } from '../utils/errors';
import { useUserDirectory } from './useContacts';
import { useUserGroups } from './useGroups';

export type ConversationListItem = ConversationSummary & { lastMessage: ChatMessage | null };

export type ConversationsState = {
  conversations: ConversationListItem[];
  isLoading: boolean;
  error: string | null;
};

/** Última mensagem de cada conversa (um listener do Realtime Database por conversa). */
function useLastMessages(conversationIds: readonly string[]): Record<string, ChatMessage | null> {
  const [lastMessages, setLastMessages] = useState<Record<string, ChatMessage | null>>({});
  const key = useMemo(() => [...conversationIds].sort().join(','), [conversationIds]);

  useEffect(() => {
    const ids = key.length > 0 ? key.split(',') : [];
    const unsubscribes = ids.map((id) =>
      observeLastMessage(id, (message) => setLastMessages((current) => ({ ...current, [id]: message }))),
    );
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [key]);

  return lastMessages;
}

/** Conversas individuais + grupos do usuário, ordenados pela atividade mais recente. */
export function useConversations(uid: string): ConversationsState {
  const [directs, setDirects] = useState<DirectConversationRecord[]>([]);
  const [directsLoading, setDirectsLoading] = useState(true);
  const [directsError, setDirectsError] = useState<string | null>(null);
  const { groups, isLoading: groupsLoading, error: groupsError } = useUserGroups(uid);

  useEffect(() => {
    setDirectsLoading(true);
    return observeDirectConversations(
      uid,
      (list) => {
        setDirects(list);
        setDirectsError(null);
        setDirectsLoading(false);
      },
      (failure) => {
        setDirectsError(describeError(failure, 'Não foi possível carregar as conversas.'));
        setDirectsLoading(false);
      },
    );
  }, [uid]);

  const otherIds = useMemo(
    () => directs.map((item) => (item.participantIds[0] === uid ? item.participantIds[1] : item.participantIds[0])),
    [directs, uid],
  );
  const directory = useUserDirectory(otherIds);

  const conversationIds = useMemo(
    () => [...directs.map((item) => item.id), ...groups.map((group) => group.id)],
    [directs, groups],
  );
  const lastMessages = useLastMessages(conversationIds);

  const conversations = useMemo<ConversationListItem[]>(() => {
    const directItems = directs.map((item, index): ConversationListItem => {
      const otherId = otherIds[index];
      const other = directory[otherId];
      const lastMessage = lastMessages[item.id] ?? null;
      return {
        id: item.id,
        type: 'direct',
        title: other?.name ?? 'Usuário',
        photoUrl: other?.photoUrl ?? '',
        otherUserId: otherId,
        memberCount: 2,
        sortKey: lastMessage?.createdAt ?? item.createdAt,
        lastMessage,
      };
    });
    const groupItems = groups.map((group): ConversationListItem => {
      const lastMessage = lastMessages[group.id] ?? null;
      return {
        id: group.id,
        type: 'group',
        title: group.name,
        photoUrl: group.photoUrl,
        otherUserId: null,
        memberCount: group.memberIds.length,
        sortKey: lastMessage?.createdAt ?? group.updatedAt,
        lastMessage,
      };
    });
    return [...directItems, ...groupItems].sort((a, b) => b.sortKey - a.sortKey);
  }, [directory, directs, groups, lastMessages, otherIds]);

  return {
    conversations,
    isLoading: directsLoading || groupsLoading,
    error: directsError ?? groupsError,
  };
}
