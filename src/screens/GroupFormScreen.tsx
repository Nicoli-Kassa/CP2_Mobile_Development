import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '../components/AppButton';
import { AppTextInput } from '../components/AppTextInput';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { KeyboardAvoidingContainer } from '../components/KeyboardAvoidingContainer';
import { Loading } from '../components/Loading';
import { NoticeBanner } from '../components/NoticeBanner';
import { PhotoPicker } from '../components/PhotoPicker';
import { PolicySelector } from '../components/PolicySelector';
import { ScreenContainer } from '../components/ScreenContainer';
import { PHOTO_UPLOAD_ENABLED } from '../config/appConfig';
import { useCurrentUser } from '../hooks/useAuth';
import { useUserDirectory } from '../hooks/useContacts';
import { useGroup, useGroupActions } from '../hooks/useGroups';
import { createGroup, syncGroupMembers, updateGroupPhoto } from '../services/groupService';
import { uploadGroupPhoto } from '../services/storageService';
import { colors, fontSize, radius, spacing } from '../theme/theme';
import type { NotificationPolicy } from '../types/group';
import type { AppStackParamList } from '../types/navigation';
import { describeError } from '../utils/errors';
import {
  availableSlots,
  parseMemberLimit,
  validateGroupName,
  validateMemberCount,
  validateMemberLimit,
} from '../utils/groupValidation';
import { errorOf } from '../utils/validation';

type GroupFormScreenProps = NativeStackScreenProps<AppStackParamList, 'GroupForm'>;

const DEFAULT_LIMIT = '10';

/**
 * Criação (sem `groupId`) e edição (com `groupId`) de grupo.
 * Na edição, somente o proprietário altera dados e integrantes.
 */
export function GroupFormScreen({ navigation, route }: GroupFormScreenProps): React.JSX.Element {
  const user = useCurrentUser();
  const groupId = route.params?.groupId ?? null;
  const pickedMemberIds = route.params?.pickedMemberIds;
  const isEdit = groupId !== null;

  const { group, isLoading, error: groupError, notMember } = useGroup(groupId, user.uid);
  const actions = useGroupActions(groupId, user.uid);

  const [name, setName] = useState('');
  const [limitText, setLimitText] = useState(DEFAULT_LIMIT);
  const [policy, setPolicy] = useState<NotificationPolicy>('all_group_messages');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoChanged, setPhotoChanged] = useState(false);
  /** Na criação: integrantes escolhidos (além do proprietário). */
  const [draftMemberIds, setDraftMemberIds] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{ name: string | null; limit: string | null }>({
    name: null,
    limit: null,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Preenche o formulário uma única vez quando o grupo carrega.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (group && !initializedRef.current) {
      initializedRef.current = true;
      setName(group.name);
      setLimitText(String(group.memberLimit));
      setPolicy(group.notificationPolicy);
      setPhotoUri(group.photoUrl || null);
    }
  }, [group]);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Gerenciar grupo' : 'Novo grupo' });
  }, [isEdit, navigation]);

  const memberIds = useMemo(
    () => (isEdit ? (group?.memberIds ?? []) : [user.uid, ...draftMemberIds]),
    [draftMemberIds, group, isEdit, user.uid],
  );
  const directory = useUserDirectory(memberIds);

  const parsedLimit = parseMemberLimit(limitText);
  const effectiveLimit = isEdit ? (group?.memberLimit ?? 0) : (parsedLimit ?? 0);
  const slots = availableSlots(memberIds.length, effectiveLimit);
  const noSlots = effectiveLimit > 0 && slots === 0;
  const isOwner = !isEdit || group?.ownerId === user.uid;
  const busy = isCreating || actions.isSaving;

  // Integrantes escolhidos na tela de usuários voltam por parâmetro de rota.
  const { addMembers } = actions;
  useEffect(() => {
    if (!pickedMemberIds) {
      return;
    }
    navigation.setParams({ pickedMemberIds: undefined });
    if (isEdit) {
      if (pickedMemberIds.length > 0) {
        void addMembers(pickedMemberIds).then((ok) => setSuccess(ok ? 'Integrantes adicionados.' : null));
      }
    } else {
      setDraftMemberIds(pickedMemberIds.filter((id) => id !== user.uid));
    }
  }, [addMembers, isEdit, navigation, pickedMemberIds, user.uid]);

  const handlePhoto = useCallback((uri: string) => {
    setPhotoUri(uri);
    setPhotoChanged(true);
  }, []);

  const openMemberPicker = useCallback(() => {
    const limit = isEdit ? (group?.memberLimit ?? 0) : parsedLimit;
    const limitCheck = validateMemberLimit(limit, memberIds.length);
    if (!limitCheck.valid || limit === null) {
      setFieldErrors((current) => ({ ...current, limit: errorOf(limitCheck) }));
      return;
    }
    navigation.navigate('Users', {
      mode: 'select-members',
      groupId,
      selectedIds: isEdit ? [] : draftMemberIds,
      lockedIds: isEdit ? memberIds.filter((id) => id !== user.uid) : [],
      memberLimit: limit,
    });
  }, [draftMemberIds, group, groupId, isEdit, memberIds, navigation, parsedLimit, user.uid]);

  const removeMember = useCallback(
    (memberId: string) => {
      if (!isEdit) {
        setDraftMemberIds((current) => current.filter((id) => id !== memberId));
        return;
      }
      const memberName = directory[memberId]?.name ?? 'este integrante';
      Alert.alert('Remover integrante', `Remover ${memberName} do grupo? Ele deixará de ver novas mensagens.`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            void actions.removeMember(memberId).then((ok) => setSuccess(ok ? `${memberName} foi removido.` : null));
          },
        },
      ]);
    },
    [actions, directory, isEdit],
  );

  const validateForm = useCallback((): number | null => {
    const nameError = errorOf(validateGroupName(name));
    const limitError = errorOf(validateMemberLimit(parsedLimit, memberIds.length));
    setFieldErrors({ name: nameError, limit: limitError });
    if (nameError || limitError || parsedLimit === null) {
      return null;
    }
    const countError = errorOf(validateMemberCount(memberIds.length, parsedLimit));
    if (countError) {
      setFormError(countError);
      return null;
    }
    return parsedLimit;
  }, [memberIds.length, name, parsedLimit]);

  const handleCreate = useCallback(async () => {
    setFormError(null);
    const limit = validateForm();
    if (limit === null) {
      return;
    }
    setIsCreating(true);
    try {
      const created = await createGroup({
        name,
        ownerId: user.uid,
        memberIds: draftMemberIds,
        memberLimit: limit,
        notificationPolicy: policy,
      });
      if (photoUri) {
        try {
          await updateGroupPhoto(created.id, await uploadGroupPhoto(created.id, photoUri));
        } catch {
          // O grupo segue válido com a imagem padrão; a foto pode ser trocada depois.
        }
      }
      try {
        await syncGroupMembers(created.id);
      } catch (failure) {
        setIsCreating(false);
        navigation.replace('GroupForm', { groupId: created.id });
        Alert.alert('Grupo criado', `Falta liberar o acesso às mensagens: ${describeError(failure)}`);
        return;
      }
      navigation.replace('Chat', { conversationId: created.id, conversationType: 'group' });
    } catch (failure) {
      setFormError(describeError(failure, 'Não foi possível criar o grupo.'));
      setIsCreating(false);
    }
  }, [draftMemberIds, name, navigation, photoUri, policy, user.uid, validateForm]);

  const handleSave = useCallback(async () => {
    setFormError(null);
    setSuccess(null);
    const limit = validateForm();
    if (limit === null || !groupId) {
      return;
    }
    const saved = await actions.saveSettings({ name, memberLimit: limit, notificationPolicy: policy });
    if (!saved) {
      return;
    }
    if (photoChanged && photoUri) {
      try {
        await updateGroupPhoto(groupId, await uploadGroupPhoto(groupId, photoUri));
        setPhotoChanged(false);
      } catch (failure) {
        setFormError(`Dados salvos, mas a foto não foi enviada: ${describeError(failure)}`);
        return;
      }
    }
    setSuccess('Alterações salvas.');
  }, [actions, groupId, name, photoChanged, photoUri, policy, validateForm]);

  if (isEdit && isLoading) {
    return <Loading variant="full" message="Carregando grupo..." />;
  }

  if (isEdit && (!group || notMember)) {
    return (
      <ScreenContainer edges={['left', 'right', 'bottom']}>
        <View style={styles.centered}>
          <ErrorMessage message={groupError ?? 'Você não faz mais parte deste grupo.'} />
          <AppButton label="Voltar para conversas" onPress={() => navigation.popToTop()} />
        </View>
      </ScreenContainer>
    );
  }

  if (!isOwner) {
    return (
      <ScreenContainer edges={['left', 'right', 'bottom']}>
        <View style={styles.centered}>
          <ErrorMessage message="Somente o proprietário pode gerenciar este grupo." />
          {groupId ? (
            <AppButton label="Ver integrantes" onPress={() => navigation.replace('GroupMembers', { groupId })} />
          ) : null}
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingContainer>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {formError ? <ErrorMessage message={formError} onDismiss={() => setFormError(null)} /> : null}
          {actions.actionError ? (
            <ErrorMessage
              message={actions.actionError}
              onRetry={() => void actions.resync()}
              retryLabel="Sincronizar acesso"
              onDismiss={actions.clearActionError}
            />
          ) : null}
          {success ? <NoticeBanner tone="success" message={success} onDismiss={() => setSuccess(null)} /> : null}

          <View style={styles.card}>
            {PHOTO_UPLOAD_ENABLED ? (
              <PhotoPicker uri={photoUri} onChange={handlePhoto} variant="group" disabled={busy} />
            ) : null}
            <AppTextInput
              label="Nome do grupo"
              value={name}
              onChangeText={setName}
              placeholder="Ex.: Turma de Mobile"
              autoCapitalize="sentences"
              editable={!busy}
              errorText={fieldErrors.name}
              maxLength={60}
            />
            <AppTextInput
              label="Limite de integrantes (incluindo você)"
              value={limitText}
              onChangeText={(value) => setLimitText(value.replace(/\D/g, ''))}
              placeholder="Ex.: 5"
              keyboardType="number-pad"
              editable={!busy}
              errorText={fieldErrors.limit}
              maxLength={3}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notificações push</Text>
            <PolicySelector value={policy} onChange={setPolicy} disabled={busy} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Integrantes</Text>
            <Text style={[styles.capacity, noSlots ? styles.capacityFull : null]}>
              {memberIds.length} de {effectiveLimit || '—'} integrantes ·{' '}
              {noSlots ? 'grupo sem vagas' : `${slots} vaga(s) disponível(is)`}
            </Text>
            {isEdit && parsedLimit !== null && parsedLimit !== group?.memberLimit ? (
              <Text style={styles.hint}>O novo limite vale depois de salvar as alterações.</Text>
            ) : null}

            {memberIds.map((memberId) => (
              <GroupMemberItem
                key={memberId}
                name={directory[memberId]?.name ?? 'Carregando...'}
                photoUrl={directory[memberId]?.photoUrl ?? ''}
                isOwner={memberId === (group?.ownerId ?? user.uid)}
                isCurrentUser={memberId === user.uid}
                onRemove={memberId !== user.uid ? () => removeMember(memberId) : undefined}
                disabled={busy}
              />
            ))}

            <AppButton
              label="Adicionar integrantes"
              icon="➕"
              variant="secondary"
              onPress={openMemberPicker}
              disabled={busy || noSlots}
              helperText={noSlots ? 'Grupo sem vagas: aumente o limite para adicionar mais pessoas.' : null}
            />
          </View>

          {isEdit ? (
            <AppButton label="Salvar alterações" onPress={handleSave} isLoading={actions.isSaving} disabled={busy} />
          ) : (
            <AppButton label="Criar grupo" onPress={handleCreate} isLoading={isCreating} disabled={busy} />
          )}
        </ScrollView>
      </KeyboardAvoidingContainer>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  capacity: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  capacityFull: {
    color: colors.danger,
  },
  hint: {
    color: colors.warning,
    fontSize: fontSize.xs,
  },
});
