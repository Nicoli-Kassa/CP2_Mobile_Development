import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '../components/AppButton';
import { AppTextInput } from '../components/AppTextInput';
import { ErrorMessage } from '../components/ErrorMessage';
import { KeyboardAvoidingContainer } from '../components/KeyboardAvoidingContainer';
import { PhotoPicker } from '../components/PhotoPicker';
import { ScreenContainer } from '../components/ScreenContainer';
import { PHOTO_UPLOAD_ENABLED } from '../config/appConfig';
import { useAuth } from '../hooks/useAuth';
import { colors, fontSize, radius, spacing } from '../theme/theme';
import type { AuthStackParamList } from '../types/navigation';
import { formatPhone, maskBirthDate, phoneDigits } from '../utils/format';
import {
  errorOf,
  validateBirthDate,
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordConfirmation,
  validatePhone,
  validatePhoto,
} from '../utils/validation';

type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'>;

type Field = 'name' | 'email' | 'phone' | 'birthDate' | 'password' | 'confirmation' | 'photo';
type FieldErrors = Record<Field, string | null>;

const NO_ERRORS: FieldErrors = {
  name: null,
  email: null,
  phone: null,
  birthDate: null,
  password: null,
  confirmation: null,
  photo: null,
};

/** Cadastro com nome, e-mail, celular, nascimento, foto e senha. */
export function RegisterScreen({ navigation }: RegisterScreenProps): React.JSX.Element {
  const { register, pendingAction, isBusy, error, clearError } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(NO_ERRORS);

  const handlePhone = useCallback((value: string) => setPhone(formatPhone(value)), []);
  const handleBirthDate = useCallback((value: string) => setBirthDate(maskBirthDate(value)), []);

  const handleSubmit = useCallback(async () => {
    clearError();
    const next: FieldErrors = {
      name: errorOf(validateName(name)),
      email: errorOf(validateEmail(email)),
      phone: errorOf(validatePhone(phoneDigits(phone))),
      birthDate: errorOf(validateBirthDate(birthDate)),
      password: errorOf(validatePassword(password)),
      confirmation: errorOf(validatePasswordConfirmation(password, confirmation)),
      photo: PHOTO_UPLOAD_ENABLED ? errorOf(validatePhoto(photoUri)) : null,
    };
    setFieldErrors(next);
    if (Object.values(next).some((message) => message !== null) || (PHOTO_UPLOAD_ENABLED && !photoUri)) {
      return;
    }
    await register({ name, email, password, phoneNumber: phone, birthDate, photoUri: PHOTO_UPLOAD_ENABLED ? photoUri : null });
  }, [birthDate, clearError, confirmation, email, name, password, phone, photoUri, register]);

  const goToLogin = useCallback(() => {
    clearError();
    navigation.goBack();
  }, [clearError, navigation]);

  return (
    <ScreenContainer>
      <KeyboardAvoidingContainer>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Criar conta</Text>
            <Text style={styles.subtitle}>Preencha seus dados para começar a conversar.</Text>
          </View>

          {error ? <ErrorMessage message={error} onDismiss={clearError} /> : null}

          <View style={styles.card}>
            {PHOTO_UPLOAD_ENABLED ? (
              <PhotoPicker uri={photoUri} onChange={setPhotoUri} disabled={isBusy} errorText={fieldErrors.photo} />
            ) : null}

            <AppTextInput
              label="Nome"
              value={name}
              onChangeText={setName}
              placeholder="Seu nome completo"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              editable={!isBusy}
              errorText={fieldErrors.name}
              maxLength={60}
            />
            <AppTextInput
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              placeholder="voce@exemplo.com"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              editable={!isBusy}
              errorText={fieldErrors.email}
            />
            <AppTextInput
              label="Celular"
              value={phone}
              onChangeText={handlePhone}
              placeholder="(11) 91234-5678"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              editable={!isBusy}
              errorText={fieldErrors.phone}
            />
            <AppTextInput
              label="Data de nascimento"
              value={birthDate}
              onChangeText={handleBirthDate}
              placeholder="DD/MM/AAAA"
              keyboardType="number-pad"
              editable={!isBusy}
              errorText={fieldErrors.birthDate}
            />
            <AppTextInput
              label="Senha"
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo de 6 caracteres"
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!isBusy}
              errorText={fieldErrors.password}
            />
            <AppTextInput
              label="Confirmar senha"
              value={confirmation}
              onChangeText={setConfirmation}
              placeholder="Repita a senha"
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!isBusy}
              errorText={fieldErrors.confirmation}
              onSubmitEditing={handleSubmit}
              returnKeyType="go"
            />

            <AppButton
              label="Cadastrar"
              onPress={handleSubmit}
              isLoading={pendingAction === 'sign-up'}
              disabled={isBusy}
            />
            <AppButton label="Já tem conta? Entrar" onPress={goToLogin} variant="ghost" disabled={isBusy} />
          </View>
        </ScrollView>
      </KeyboardAvoidingContainer>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
