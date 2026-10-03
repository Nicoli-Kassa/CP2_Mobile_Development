import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View, type ListRenderItemInfo } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '../components/AppButton';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { ScreenContainer } from '../components/ScreenContainer';
import { UserItem } from '../components/UserItem';
import { useCurrentUser } from '../hooks/useAuth';
import { useUsers } from '../hooks/useContacts';
import { ensureDirectConversation } from '../services/chatService';
import { colors, fontSize, radius, spacing } from '../theme/theme';
import type { AppStackParamList } from '../types/navigation';
import type { PublicUser } from '../types/user';
import { describeError } from '../utils/errors';
import { availableSlots } from '../utils/groupValidation';

type UsersScreenProps = NativeStackScreenProps<AppStackParamList, 'Users'>;

/**
 * Usuários cadastrados, com busca.
 * - modo `direct`: toque inicia (ou reabre) a conversa individual;
 * - modo `select-members`: marca integrantes para um grupo, respeitando as vagas.
 */
export function UsersScreen({ navigation, route }: UsersScreenProps): React.JSX.Element {
  const params = route.params;
  const user = useCurrentUser();
  const [search, setSearch] = useState('');
  const { users, totalUsers, isLoading, error, retry } = useUsers(user.uid, search);
  const [opening, setOpening] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isSelectMode = params.mode === 'select-members';
  const lockedIds = useMemo(() => (params.mode === 'select-members' ? params.lockedIds : []), [params]);
  const [selected, setSelected] = useState<string[]>(params.mode === 'select-members' ? params.selectedIds : []);

  useEffect(() => {
    navigation.setOptions({ title: isSelectMode ? 'Escolher integrantes' : 'Nova conversa' });
  }, [isSelectMode, navigation]);

  // O próprio usuário conta como integrante do grupo (proprietário).
  const memberCount = useMemo(
    () => new Set([user.uid, ...lockedIds, ...selected]).size,
    [lockedIds, selected, user.uid],
  );
  const memberLimit = params.mode === 'select-members' ? params.memberLimit : 0;
  const slots = availableSlots(memberCount, memberLimit);

  const toggle = useCallback(
    (target: PublicUser) => {
      setActionError(null);
      if (lockedIds.includes(target.uid)) {
        return;
      }
      if (selected.includes(target.uid)) {
        setSelected((current) => current.filter((id) => id !== target.uid));
        return;
      }
      if (slots === 0) {
        setActionError('Não há mais vagas neste grupo. Aumente o limite ou remova alguém.');
        return;
      }
      setSelected((current) => [...current, target.uid]);
    },
    [lockedIds, selected, slots],
  );

  const startConversation = useCallback(
    async (target: PublicUser) => {
      setActionError(null);
      setOpening(target.uid);
      try {
        const conversationId = await ensureDirectConversation(user.uid, target.uid);
        navigation.replace('Chat', { conversationId, conversationType: 'direct' });
      } catch (failure) {
        setActionError(describeError(failure, 'Não foi possível abrir a conversa.'));
      } finally {
        setOpening(null);
      }
    },
    [navigation, user.uid],
  );

  const confirmSelection = useCallback(() => {
    if (params.mode !== 'select-members') {
      return;
    }
    const picked = params.groupId ? selected.filter((id) => !lockedIds.includes(id)) : selected;
    navigation.popTo('GroupForm', { groupId: params.groupId ?? undefined, pickedMemberIds: picked }, { merge: true });
  }, [lockedIds, navigation, params, selected]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<PublicUser>) => {
      if (!isSelectMode) {
        return (
          <UserItem
            user={item}
            onPress={startConversation}
            disabled={opening !== null}
            subtitle={opening === item.uid ? 'Abrindo conversa...' : undefined}
          />
        );
      }
      const locked = lockedIds.includes(item.uid);
      return (
        <UserItem
          user={item}
          onPress={toggle}
          selectable
          selected={locked || selected.includes(item.uid)}
          disabled={locked}
          subtitle={locked ? 'Já é integrante' : undefined}
        />
      );
    },
    [isSelectMode, lockedIds, opening, selected, startConversation, toggle],
  );

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <View style={styles.top}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar pelo nome"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          accessibilityLabel="Buscar usuários"
        />
        {isSelectMode ? (
          <Text style={[styles.counter, slots === 0 ? styles.counterFull : null]}>
            {memberCount}/{memberLimit} integrantes (contando você) —{' '}
            {slots === 0 ? 'grupo sem vagas' : `${slots} vaga(s) disponível(is)`}
          </Text>
        ) : null}
        {actionError ? <ErrorMessage message={actionError} onDismiss={() => setActionError(null)} /> : null}
        {error ? <ErrorMessage message={error} onRetry={retry} /> : null}
      </View>

      {isLoading ? (
        <Loading message="Carregando usuários..." />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.uid}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.list, users.length === 0 ? styles.listEmpty : null]}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={
            <EmptyState
              icon="👥"
              title={totalUsers === 0 ? 'Nenhum usuário disponível' : 'Ninguém encontrado'}
              description={
                totalUsers === 0
                  ? 'Ainda não há outras pessoas cadastradas. A lista atualiza sozinha quando alguém criar conta.'
                  : 'Tente buscar por outro nome.'
              }
            />
          }
        />
      )}

      {isSelectMode ? (
        <View style={styles.footer}>
          <AppButton label="Confirmar seleção" onPress={confirmSelection} />
        </View>
      ) : null}
    </ScreenContainer>
  );
}

function Separator(): React.JSX.Element {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  top: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  search: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 46,
    color: colors.text,
    fontSize: fontSize.md,
  },
  counter: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  counterFull: {
    color: colors.danger,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  listEmpty: {
    flexGrow: 1,
  },
  separator: {
    height: spacing.sm,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
