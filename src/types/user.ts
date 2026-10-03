/**
 * Tipos de domínio ligados ao usuário.
 *
 * O `uid` é sempre o identificador gerado pelo Firebase Authentication —
 * nenhum usuário do aplicativo é criado de forma manual/hardcoded.
 */

/** Usuário completo: dados públicos + dados cadastrais. */
export type ChatUser = {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  /** Data no formato ISO `AAAA-MM-DD`. */
  birthDate: string;
  photoUrl: string;
  createdAt: number;
};

/** Parte pública do perfil (`users/{uid}`), visível para qualquer usuário autenticado. */
export type PublicUser = Pick<ChatUser, 'uid' | 'name' | 'photoUrl' | 'createdAt'>;

/** Dados cadastrais (`users/{uid}/private/profile`), protegidos pelas regras. */
export type PrivateProfile = Pick<ChatUser, 'email' | 'phoneNumber' | 'birthDate'>;

/** Dados preenchidos na tela de cadastro. */
export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  birthDate: string;
  /** `null` quando o envio de fotos está desligado (PHOTO_UPLOAD_ENABLED). */
  photoUri: string | null;
};
