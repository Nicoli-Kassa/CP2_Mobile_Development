import React, { useContext } from 'react';
import { KeyboardAvoidingView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { HeaderHeightContext } from '@react-navigation/elements';

type KeyboardAvoidingContainerProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Mantém os campos de texto acima do teclado no Android e no iOS.
 *
 * Desde o SDK 55 o Android é sempre edge-to-edge: o sistema não redimensiona
 * mais a tela quando o teclado abre, então o ajuste (`padding`) precisa ser
 * feito pelo app nas duas plataformas. O deslocamento é a altura do
 * cabeçalho da navegação (0 nas telas sem cabeçalho), porque o
 * KeyboardAvoidingView mede a própria posição a partir dele.
 */
export function KeyboardAvoidingContainer({ children, style }: KeyboardAvoidingContainerProps): React.JSX.Element {
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  return (
    <KeyboardAvoidingView style={[styles.flex, style]} behavior="padding" keyboardVerticalOffset={headerHeight}>
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
