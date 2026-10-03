/** Validações de formulário feitas antes de chamar o Firebase. */

export const MIN_PASSWORD_LENGTH = 6;
export const MAX_MESSAGE_LENGTH = 1000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type ValidationResult = { valid: true } | { valid: false; message: string };

export const VALID: ValidationResult = { valid: true };

export function validateEmail(email: string): ValidationResult {
  const value = email.trim();
  if (value.length === 0) {
    return { valid: false, message: 'Informe o e-mail.' };
  }
  if (!EMAIL_PATTERN.test(value)) {
    return { valid: false, message: 'Informe um e-mail válido.' };
  }
  return VALID;
}

export function validatePassword(password: string): ValidationResult {
  if (password.length === 0) {
    return { valid: false, message: 'Informe a senha.' };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, message: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  return VALID;
}

export function validatePasswordConfirmation(password: string, confirmation: string): ValidationResult {
  if (confirmation.length === 0) {
    return { valid: false, message: 'Confirme a senha.' };
  }
  if (password !== confirmation) {
    return { valid: false, message: 'As senhas não conferem.' };
  }
  return VALID;
}

export function validateName(name: string): ValidationResult {
  const value = name.trim();
  if (value.length < 2) {
    return { valid: false, message: 'Informe seu nome (mínimo 2 caracteres).' };
  }
  if (value.length > 60) {
    return { valid: false, message: 'O nome pode ter no máximo 60 caracteres.' };
  }
  return VALID;
}

/** Celular brasileiro: DDD + 8 ou 9 dígitos. */
export function validatePhone(digits: string): ValidationResult {
  if (digits.length === 0) {
    return { valid: false, message: 'Informe o número de celular.' };
  }
  if (!/^\d{10,11}$/.test(digits)) {
    return { valid: false, message: 'Informe o celular com DDD, ex.: (11) 91234-5678.' };
  }
  return VALID;
}

/** Converte `DD/MM/AAAA` em `AAAA-MM-DD`; `null` se a data não existir. */
export function parseBirthDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const exists =
    date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day);
  return exists ? `${year}-${month}-${day}` : null;
}

export function validateBirthDate(value: string): ValidationResult {
  if (value.trim().length === 0) {
    return { valid: false, message: 'Informe a data de nascimento.' };
  }
  const iso = parseBirthDate(value);
  if (!iso) {
    return { valid: false, message: 'Use o formato DD/MM/AAAA com uma data válida.' };
  }
  const birth = new Date(`${iso}T00:00:00`);
  const now = new Date();
  if (birth > now) {
    return { valid: false, message: 'A data de nascimento não pode estar no futuro.' };
  }
  if (now.getFullYear() - birth.getFullYear() > 120) {
    return { valid: false, message: 'Informe uma data de nascimento válida.' };
  }
  return VALID;
}

export function validatePhoto(uri: string | null): ValidationResult {
  return uri ? VALID : { valid: false, message: 'Escolha uma foto de perfil.' };
}

export function validateMessage(text: string): ValidationResult {
  const value = text.trim();
  if (value.length === 0) {
    return { valid: false, message: 'Digite uma mensagem antes de enviar.' };
  }
  if (value.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, message: `A mensagem pode ter no máximo ${MAX_MESSAGE_LENGTH} caracteres.` };
  }
  return VALID;
}

/** Mensagem de erro de um resultado, ou `null` quando válido. */
export function errorOf(result: ValidationResult): string | null {
  return result.valid ? null : result.message;
}
