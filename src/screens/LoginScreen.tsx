import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '../components/AppButton';
import { AppTextInput } from '../components/AppTextInput';
import { ErrorMessage } from '../components/ErrorMessage';
import { KeyboardAvoidingContainer } from '../components/KeyboardAvoidingContainer';
import { ScreenContainer } from '../components/ScreenContainer';
import { useAuth } from '../hooks/useAuth';
import { colors, fontSize, radius, spacing } from '../theme/theme';
import type { AuthStackParamList } from '../types/navigation';
import { errorOf, validateEmail, validatePassword } from '../utils/validation';

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;

type FieldErrors = { email: string | null; password: string | null };

/** Login com e-mail e senha — a única forma de autenticação do app. */
export function LoginScreen({ navigation }: LoginScreenProps): React.JSX.Element {
  const { signIn, pendingAction, isBusy, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({ email: null, password: null });

  const handleSubmit = useCallback(async () => {
    clearError();
    const next: FieldErrors = {
      email: errorOf(validateEmail(email)),
      password: errorOf(validatePassword(password)),
    };
    setFieldErrors(next);
    if (next.email || next.password) {
      return;
    }
    await signIn(email, password);
  }, [clearError, email, password, signIn]);

  const goToRegister = useCallback(() => {
    clearError();
    navigation.navigate('Register');
  }, [clearError, navigation]);

  return (
    <ScreenContainer>
      <KeyboardAvoidingContainer>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.logo}>💬</Text>
            <Text style={styles.appName}>CP2 Chat</Text>
            <Text style={styles.title}>Entrar</Text>
            <Text style={styles.subtitle}>Use seu e-mail e senha para acessar suas conversas.</Text>
          </View>

          {error ? <ErrorMessage message={error} onDismiss={clearError} /> : null}

          <View style={styles.card}>
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
              label="Senha"
              value={password}
              onChangeText={setPassword}
              placeholder="Sua senha"
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              editable={!isBusy}
              errorText={fieldErrors.password}
              onSubmitEditing={handleSubmit}
              returnKeyType="go"
            />
            <AppButton label="Entrar" onPress={handleSubmit} isLoading={pendingAction === 'sign-in'} disabled={isBusy} />
            <AppButton label="Não tem conta? Criar conta" onPress={goToRegister} variant="ghost" disabled={isBusy} />
          </View>
        </ScrollView>
      </KeyboardAvoidingContainer>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  logo: {
    fontSize: 48,
  },
  appName: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    lineHeight: 21,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
