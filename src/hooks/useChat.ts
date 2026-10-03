import { useCallback, useEffect, useState } from 'react';

import { observeMessages, sendMessage } from '../services/chatService';
import { setActiveConversation } from '../services/notificationService';
import type { ChatMessage, ConversationType, MessageTarget } from '../types/chat';
import { describeError, isPermissionDenied } from '../utils/errors';

/**
 * Mensagens de uma conversa em tempo real.
 *
 * O `useEffect` assina o Realtime Database e, no cleanup, remove o listener
 * — ao sair da tela ou ao trocar de conversa. Nenhuma tela precisa de
 * refresh: toda mensagem nova chega pelo próprio listener.
 */

export type SendOptions = {
  target: MessageTarget;
  mentionedUserIds: string[];
};

export type ChatState = {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  accessDenied: boolean;
  sendError: string | null;
  pushWarning: string | null;
  send: (text: string, options: SendOptions) => Promise<boolean>;
  retry: () => void;
  dismissSendError: () => void;
  dismissPushWarning: () => void;
};

export function useChat(conversationId: string, conversationType: ConversationType, senderId: string): ChatState {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [pushWarning, setPushWarning] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    setAccessDenied(false);
    setMessages([]);
    setActiveConversation(conversationId);

    const unsubscribe = observeMessages(
      conversationId,
      (list) => {
        if (active) {
          setMessages(list);
          setIsLoading(false);
        }
      },
      (failure) => {
        if (!active) {
          return;
        }
        setAccessDenied(isPermissionDenied(failure));
        setError(
          isPermissionDenied(failure)
            ? 'Você não tem acesso às mensagens desta conversa.'
            : describeError(failure, 'Não foi possível carregar as mensagens.'),
        );
        setIsLoading(false);
      },
    );

    return () => {
      active = false;
      unsubscribe();
      setActiveConversation(null);
    };
  }, [conversationId, attempt]);

  const send = useCallback(
    async (text: string, options: SendOptions): Promise<boolean> => {
      setIsSending(true);
      setSendError(null);
      try {
        const result = await sendMessage({
          conversationId,
          conversationType,
          senderId,
          text,
          target: options.target,
          mentionedUserIds: options.mentionedUserIds,
        });
        setPushWarning(result.pushError ? `Mensagem enviada, mas a notificação falhou: ${result.pushError}` : null);
        return true;
      } catch (failure) {
        setSendError(describeError(failure, 'Não foi possível enviar a mensagem.'));
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, conversationType, senderId],
  );

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const dismissSendError = useCallback(() => setSendError(null), []);
  const dismissPushWarning = useCallback(() => setPushWarning(null), []);

  return {
    messages,
    isLoading,
    isSending,
    error,
    accessDenied,
    sendError,
    pushWarning,
    send,
    retry,
    dismissSendError,
    dismissPushWarning,
  };
}
