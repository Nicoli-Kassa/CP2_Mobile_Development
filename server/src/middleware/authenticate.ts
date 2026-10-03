import type { NextFunction, Request, Response } from 'express';

import { adminAuth } from '../services/firebaseAdmin';
import { HttpError } from '../utils/httpError';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** `uid` do usuário, preenchido depois que o Firebase ID Token é validado. */
      authUid?: string;
    }
  }
}

/**
 * Valida `Authorization: Bearer <Firebase ID Token>` com o Admin SDK.
 * `checkRevoked` garante que um logout/revogação invalide o token na hora.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticação não informado.' });
    return;
  }

  try {
    const decoded = await adminAuth().verifyIdToken(header.slice('Bearer '.length).trim(), true);
    if (decoded.firebase.sign_in_provider !== 'password') {
      res.status(403).json({ error: 'Somente contas de e-mail e senha podem usar o chat.' });
      return;
    }
    req.authUid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
}

/** Lê o `uid` autenticado (o middleware já garantiu que existe). */
export function requireUid(req: Request): string {
  if (!req.authUid) {
    throw new HttpError(401, 'Usuário não autenticado.');
  }
  return req.authUid;
}
