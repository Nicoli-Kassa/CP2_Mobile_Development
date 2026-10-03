import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';
import { getFirestore, type Firestore } from 'firebase/firestore';

import firebaseConfigJson from '../../firebaseConfig.json';
import { ConfigurationError } from '../utils/errors';
import { authPersistence } from './authPersistence';

/**
 * Inicialização única do Firebase (App, Authentication, Realtime Database
 * e Firestore).
 *
 * A configuração do SDK cliente vem do arquivo versionado
 * `firebaseConfig.json` (exigência do trabalho). Esse objeto só identifica o
 * projeto — a segurança dos dados depende do Authentication e das regras.
 */

const REQUIRED_KEYS = [
  'apiKey',
  'authDomain',
  'databaseURL',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
] as const;

type RequiredKey = (typeof REQUIRED_KEYS)[number];

const firebaseConfig: Record<RequiredKey, string> = firebaseConfigJson;

/** Valores de exemplo que indicam que o arquivo ainda não foi preenchido. */
function looksLikePlaceholder(value: string): boolean {
  return value.trim().length === 0 || /seu-projeto|xxxx|abcdefghij|123456789/i.test(value);
}

export const missingFirebaseConfigKeys: string[] = REQUIRED_KEYS.filter((key) =>
  looksLikePlaceholder(firebaseConfig[key]),
);

export const isFirebaseConfigured: boolean = missingFirebaseConfigKeys.length === 0;

function assertConfigured(): void {
  if (!isFirebaseConfigured) {
    throw new ConfigurationError(
      `Firebase não configurado. Preencha em firebaseConfig.json: ${missingFirebaseConfigKeys.join(', ')}.`,
    );
  }
}

const options: FirebaseOptions = { ...firebaseConfig };

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let databaseInstance: Database | null = null;
let firestoreInstance: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  assertConfigured();
  if (!appInstance) {
    appInstance = getApps().length > 0 ? getApp() : initializeApp(options);
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    const app = getFirebaseApp();
    try {
      // Persistência em AsyncStorage: a sessão é recuperada ao reabrir o app.
      authInstance = initializeAuth(app, { persistence: authPersistence });
    } catch {
      // `initializeAuth` só pode rodar uma vez; no Fast Refresh a instância já existe.
      authInstance = getAuth(app);
    }
  }
  return authInstance;
}

export function getFirebaseDatabase(): Database {
  if (!databaseInstance) {
    databaseInstance = getDatabase(getFirebaseApp());
  }
  return databaseInstance;
}

export function getFirebaseFirestore(): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(getFirebaseApp());
  }
  return firestoreInstance;
}
