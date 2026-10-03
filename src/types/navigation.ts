import type { ConversationType } from './chat';

/** Rotas antes do login. */
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

/** Parâmetros da tela de usuários: iniciar conversa ou escolher integrantes de um grupo. */
export type UsersScreenParams =
  | { mode: 'direct' }
  | {
      mode: 'select-members';
      /** `null` enquanto o grupo ainda está sendo criado. */
      groupId: string | null;
      /** Integrantes já escolhidos (podem ser desmarcados). */
      selectedIds: string[];
      /** Integrantes atuais do grupo (não podem ser desmarcados aqui). */
      lockedIds: string[];
      memberLimit: number;
    };

/** Rotas disponíveis quando existe um usuário autenticado. */
export type AppStackParamList = {
  Conversations: undefined;
  Users: UsersScreenParams;
  GroupForm: { groupId?: string; pickedMemberIds?: string[] } | undefined;
  Chat: { conversationId: string; conversationType: ConversationType };
  Profile: { userId: string };
  GroupMembers: { groupId: string };
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends AppStackParamList {}
  }
}
