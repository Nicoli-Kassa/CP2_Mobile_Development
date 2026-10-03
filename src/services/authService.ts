import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Unsubscribe,
  type User,
} from 'firebase/auth';

import type { ChatUser, RegisterInput } from '../types/user';
import { describeError } from '../utils/errors';
import { parseBirthDate } from '../utils/validation';
import { phoneDigits } from '../utils/format';
import { getFirebaseAuth } from './firebase';
import { uploadProfilePhoto } from './storageService';
import { createUserProfile } from './userService';

/**
 * Firebase Authentication — somente e-mail e senha.
 * As telas e os hooks nunca importam `firebase/auth` diretamente.
 */

/** Observa login/logout — é a única fonte de verdade da sessão. */
export function observeAuthState(onUser: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(getFirebaseAuth(), onUser);
}

/** `true` apenas para contas de e-mail e senha. */
export function isPasswordUser(user: User): boolean {
  return user.providerData.length > 0 && user.providerData.every((info) => info.providerId === 'password');
}

export type RegisterResult = {
  user: ChatUser;
  /** Aviso quando a conta foi criada mas a foto não pôde ser enviada. */
  warning: string | null;
};

/**
 * Cadastro: cria a conta, envia a foto ao Storage (se houver) e grava o perfil no Firestore.
 * Se o perfil não puder ser gravado, a conta recém-criada é removida para
 * não deixar um usuário "pela metade".
 */
export async function registerWithEmail(input: RegisterInput): Promise<RegisterResult> {
  const birthDate = parseBirthDate(input.birthDate) ?? '';
  const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), input.email.trim(), input.password);
  const { user } = credential;
  const name = input.name.trim();

  let photoUrl = '';
  let warning: string | null = null;
  if (input.photoUri) {
    try {
      photoUrl = await uploadProfilePhoto(user.uid, input.photoUri);
    } catch (error) {
      warning = `Conta criada, mas a foto não foi enviada: ${describeError(error, 'falha no upload')}`;
    }
  }

  const profile: ChatUser = {
    uid: user.uid,
    name,
    email: user.email ?? input.email.trim(),
    phoneNumber: phoneDigits(input.phoneNumber),
    birthDate,
    photoUrl,
    createdAt: Date.now(),
  };

  try {
    await updateProfile(user, { displayName: name, photoURL: photoUrl || null });
    await createUserProfile(
      { uid: profile.uid, name: profile.name, photoUrl: profile.photoUrl, createdAt: profile.createdAt },
      { email: profile.email, phoneNumber: profile.phoneNumber, birthDate: profile.birthDate },
    );
  } catch (error) {
    await deleteUser(user).catch(() => undefined);
    throw error;
  }

  return { user: profile, warning };
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}
