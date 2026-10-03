import React, { useCallback, useEffect, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View, type ListRenderItemInfo } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '../components/AppButton';
import { Avatar } from '../components/Avatar';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { POLICY_INFO } from '../components/PolicySelector';
import { ScreenContainer } from '../components/ScreenContainer';
import { useCurrentUser } from '../hooks/useAuth';
import { useUserDirectory } from '../hooks/useContacts';
import { useGroup } from '../hooks/useGroups';
import { colors, fontSize, spacing } from '../theme/theme';
import type { AppStackParamList } from '../types/navigation';
import { availableSlots } from '../utils/groupValidation';

type GroupMembersScreenProps = NativeStackScreenProps<AppStackParamList, 'GroupMembers'>;

/** Foto do grupo + todos os integrantes; tocar num integrante abre o perfil. */
export function GroupMembersScreen({ route, navigation }: GroupMembersScreenProps): React.JSX.Element {
  const { groupId } = route.params;
  const user = useCurrentUser();
  const { group, isLoading, error, notMember } = useGroup(groupId, user.uid);
  const memberIds = useMemo(() => group?.memberIds ?? [], [group]);
  const directory = useUserDirectory(memberIds);

  useEffect(() => {
    navigation.setOptions({ title: 'Integrantes' });
  }, [navigation]);

  // Proprietário primeiro, depois ordem alfabética.
  const sortedIds = useMemo(
    () =>
      [...memberIds].sort((a, b) => {
        if (a === group?.ownerId) {
          return -1;
        }
        if (b === group?.ownerId) {
          return 1;
        }
        return (directory[a]?.name ?? '').localeCompare(directory[b]?.name ?? '', 'pt-BR');
      }),
    [directory, group, memberIds],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<string>) => (
      <GroupMemberItem
        name={directory[item]?.name ?? 'Carregando...'}
        photoUrl={directory[item]?.photoUrl ?? ''}
        isOwner={item === group?.ownerId}
        isCurrentUser={item === user.uid}
        onPress={() => navigation.navigate('Profile', { userId: item })}
      />
    ),
    [directory, group, navigation, user.uid],
  );

  if (isLoading) {
    return <Loading variant="full" message="Carregando integrantes..." />;
  }

  if (!group || notMember) {
    return (
      <ScreenContainer edges={['left', 'right', 'bottom']}>
        <View style={styles.centered}>
          <ErrorMessage message={error ?? 'Você não faz mais parte deste grupo.'} />
        </View>
      </ScreenContainer>
    );
  }

  const slots = availableSlots(group.memberIds.length, group.memberLimit);

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <FlatList
        data={sortedIds}
        keyExtractor={(item) => item}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <View style={styles.hero}>
            <Avatar uri={group.photoUrl} size={110} variant="group" label={`Foto do grupo ${group.name}`} />
            <Text style={styles.name}>{group.name}</Text>
            <Text style={styles.meta}>
              {group.memberIds.length} de {group.memberLimit} integrantes ·{' '}
              {slots === 0 ? 'sem vagas' : `${slots} vaga(s)`}
            </Text>
            <Text style={styles.meta}>Push: {POLICY_INFO[group.notificationPolicy].title}</Text>
            {group.ownerId === user.uid ? (
              <AppButton
                label="Gerenciar grupo"
                icon="⚙️"
                variant="secondary"
                compact
                onPress={() => navigation.navigate('GroupForm', { groupId })}
              />
            ) : null}
          </View>
        }
      />
    </ScreenContainer>
  );
}

function Separator(): React.JSX.Element {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  list: {
    padding: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  name: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  meta: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  separator: {
    height: spacing.sm,
  },
});
