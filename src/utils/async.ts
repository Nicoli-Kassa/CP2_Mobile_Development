import { AppError } from './errors';

/**
 * Rejeita com `AppError(message)` se a promessa não terminar em `ms`.
 * Evita telas presas quando uma gravação no Firebase nunca é confirmada.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AppError(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
