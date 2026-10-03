import type { ValidationResult } from './validation';

/** Regras de capacidade do grupo, usadas pela interface e pelo `groupService`. */

export const MIN_GROUP_MEMBERS = 2;
export const MAX_GROUP_LIMIT = 100;

/** Converte o texto digitado em limite; `null` quando não é um inteiro. */
export function parseMemberLimit(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  return Number(trimmed);
}

export function validateMemberLimit(limit: number | null, currentMembers: number): ValidationResult {
  if (limit === null || !Number.isInteger(limit)) {
    return { valid: false, message: 'O limite precisa ser um número inteiro.' };
  }
  if (limit < MIN_GROUP_MEMBERS) {
    return { valid: false, message: `O limite mínimo é ${MIN_GROUP_MEMBERS} integrantes.` };
  }
  if (limit > MAX_GROUP_LIMIT) {
    return { valid: false, message: `O limite máximo é ${MAX_GROUP_LIMIT} integrantes.` };
  }
  if (limit < currentMembers) {
    return {
      valid: false,
      message: `O limite não pode ser menor que a quantidade atual de integrantes (${currentMembers}).`,
    };
  }
  return { valid: true };
}

export function validateGroupName(name: string): ValidationResult {
  const value = name.trim();
  if (value.length < 2) {
    return { valid: false, message: 'Informe o nome do grupo (mínimo 2 caracteres).' };
  }
  if (value.length > 60) {
    return { valid: false, message: 'O nome do grupo pode ter no máximo 60 caracteres.' };
  }
  return { valid: true };
}

export function validateMemberCount(count: number, limit: number): ValidationResult {
  if (count < MIN_GROUP_MEMBERS) {
    return { valid: false, message: 'Um grupo precisa de pelo menos 2 integrantes, contando você.' };
  }
  if (count > limit) {
    return { valid: false, message: `O grupo comporta no máximo ${limit} integrantes.` };
  }
  return { valid: true };
}

/** Vagas ainda disponíveis (nunca negativo). */
export function availableSlots(memberCount: number, limit: number): number {
  return Math.max(0, limit - memberCount);
}
