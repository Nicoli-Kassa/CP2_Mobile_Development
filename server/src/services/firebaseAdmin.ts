import { cert, getApps, initializeApp, type App, type Credential } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getDatabase, type Database } from 'firebase-admin/database';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * Inicialização do Firebase Admin SDK.
 *
 * As credenciais vêm SOMENTE da hospedagem, nunca do repositório:
 *  - FIREBASE_SERVICE_ACCOUNT_FILE: caminho do JSON da conta de serviço
 *    (ex.: Secret File do Render em /etc/secrets/firebase-service-account.json); ou
 *  - FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY separados.
 * FIREBASE_DATABASE_URL é sempre obrigatória.
 */

const KEY_ENV = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'] as const;

let adminApp: App | null = null;

function readEnv(key: string): string | null {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : null;
}

export function missingAdminEnv(): string[] {
  const missing: string[] = readEnv('FIREBASE_DATABASE_URL') ? [] : ['FIREBASE_DATABASE_URL'];
  if (readEnv('FIREBASE_SERVICE_ACCOUNT_FILE')) {
    return missing;
  }
  const missingKeys = KEY_ENV.filter((key) => !readEnv(key));
  return missingKeys.length > 0 ? [...missing, `FIREBASE_SERVICE_ACCOUNT_FILE (ou ${missingKeys.join(', ')})`] : missing;
}

function buildCredential(): Credential {
  const serviceAccountFile = readEnv('FIREBASE_SERVICE_ACCOUNT_FILE');
  if (serviceAccountFile) {
    return cert(serviceAccountFile);
  }
  return cert({
    projectId: readEnv('FIREBASE_PROJECT_ID') ?? undefined,
    clientEmail: readEnv('FIREBASE_CLIENT_EMAIL') ?? undefined,
    // As hospedagens costumam guardar a quebra de linha como `\n` literal.
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  });
}

export function initializeFirebaseAdmin(): boolean {
  if (adminApp) {
    return true;
  }
  if (missingAdminEnv().length > 0) {
    return false;
  }

  try {
    adminApp =
      getApps()[0] ??
      initializeApp({
        credential: buildCredential(),
        databaseURL: readEnv('FIREBASE_DATABASE_URL') ?? undefined,
      });
  } catch (error) {
    // Arquivo inexistente ou chave inválida: a API sobe e o /health responde 503.
    console.error('Credenciais do Firebase inválidas:', error instanceof Error ? error.message : error);
    return false;
  }
  return true;
}

export function isFirebaseAdminReady(): boolean {
  return adminApp !== null;
}

function requireApp(): App {
  if (!adminApp) {
    throw new Error('Firebase Admin não inicializado. Configure as variáveis de ambiente da API.');
  }
  return adminApp;
}

export function adminAuth(): Auth {
  return getAuth(requireApp());
}

export function adminFirestore(): Firestore {
  return getFirestore(requireApp());
}

export function adminDatabase(): Database {
  return getDatabase(requireApp());
}
