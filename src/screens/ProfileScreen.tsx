import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Avatar } from '../components/Avatar';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { ScreenContainer } from '../components/ScreenContainer';
import { useCurrentUser } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';
import { colors, fontSize, radius, spacing } from '../theme/theme';
import type { AppStackParamList } from '../types/navigation';
import { formatBirthDate, formatPhone } from '../utils/format';

type ProfileScreenProps = NativeStackScreenProps<AppStackParamList, 'Profile'>;

const UNAVAILABLE = 'Não informado';

function ProfileField({ label, value }: { label: string; value: string }): React.JSX.Element {
  const missing = value.trim().length === 0;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, missing ? styles.fieldMissing : null]}>{missing ? UNAVAILABLE : value}</Text>
    </View>
  );
}

/**
 * Perfil com os dados cadastrais. Para outra pessoa, a API só libera se
 * houver conversa individual ou grupo em comum.
 */
export function ProfileScreen({ route, navigation }: ProfileScreenProps): React.JSX.Element {
  const { userId } = route.params;
  const user = useCurrentUser();
  const { profile, isLoading, error, retry } = useUserProfile(userId, user.uid);
  const isSelf = userId === user.uid;

  useEffect(() => {
    navigation.setOptions({ title: isSelf ? 'Meu perfil' : 'Perfil' });
  }, [isSelf, navigation]);

  if (isLoading) {
    return <Loading variant="full" message="Carregando perfil..." />;
  }

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {error || !profile ? (
          <ErrorMessage message={error ?? 'Perfil indisponível.'} onRetry={retry} />
        ) : (
          <>
            <View style={styles.hero}>
              <Avatar uri={profile.photoUrl} size={120} label={`Foto de ${profile.name}`} />
              <Text style={styles.name}>{profile.name || UNAVAILABLE}</Text>
            </View>
            <View style={styles.card}>
              <ProfileField label="E-mail" value={profile.email} />
              <ProfileField label="Celular" value={profile.phoneNumber ? formatPhone(profile.phoneNumber) : ''} />
              <ProfileField
                label="Data de nascimento"
                value={profile.birthDate ? formatBirthDate(profile.birthDate) : ''}
              />
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
    gap: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
  },
  name: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  field: {
    gap: 2,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  fieldValue: {
    color: colors.text,
    fontSize: fontSize.md,
  },
  fieldMissing: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
