import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors } from '../theme/theme';

type ScreenContainerProps = {
  children: ReactNode;
  edges?: readonly Edge[];
};

/** Área segura + fundo padrão usados por todas as telas. */
export function ScreenContainer({
  children,
  edges = ['top', 'bottom', 'left', 'right'],
}: ScreenContainerProps): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
});
