import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '../components/ScreenContainer';
import { missingFirebaseConfigKeys } from '../services/firebase';
import { colors, fontSize, radius, spacing } from '../theme/theme';

/**
 * Tela mostrada quando o `firebaseConfig.json` ainda tem valores de exemplo.
 * É melhor explicar o que falta do que deixar o app quebrar com um erro cru.
 */
export function FirebaseSetupScreen(): React.JSX.Element {
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.icon}>🔧</Text>
        <Text style={styles.title}>Configure o Firebase</Text>
        <Text style={styles.description}>
          Preencha o arquivo <Text style={styles.code}>firebaseConfig.json</Text> na raiz do projeto com a
          configuração do app Web do seu projeto Firebase e reinicie o Expo com{' '}
          <Text style={styles.code}>npx expo start -c</Text>.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Campos que faltam</Text>
          {missingFirebaseConfigKeys.map((key) => (
            <Text key={key} style={styles.missingKey}>
              • {key}
            </Text>
          ))}
        </View>

        <Text style={styles.hint}>
          Firebase Console → Configurações do projeto → Seus aplicativos → Web → Configuração do SDK.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  icon: {
    fontSize: 44,
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    lineHeight: 22,
    textAlign: 'center',
  },
  code: {
    color: colors.primary,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  missingKey: {
    color: colors.danger,
    fontSize: fontSize.sm,
  },
  hint: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 17,
    textAlign: 'center',
  },
});
