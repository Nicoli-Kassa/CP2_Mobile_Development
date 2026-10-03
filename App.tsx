import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/contexts/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { FirebaseSetupScreen } from './src/screens/FirebaseSetupScreen';
import { isFirebaseConfigured } from './src/services/firebase';

/**
 * CP2 — Chat individual e em grupo com Firebase e push notifications.
 *
 * Ordem de montagem: área segura → sessão (AuthProvider) → navegação.
 */
export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {isFirebaseConfigured ? (
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      ) : (
        <FirebaseSetupScreen />
      )}
    </SafeAreaProvider>
  );
}
