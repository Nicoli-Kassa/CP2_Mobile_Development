import { Router, type Request, type Response } from 'express';

import { requireUid } from '../middleware/authenticate';
import { loadFullProfile, sharesConversation } from '../services/conversationAccess';
import { asyncHandler, HttpError } from '../utils/httpError';
import { isSafeId } from '../utils/parse';

const router = Router();

/**
 * GET /users/:uid/profile
 *
 * Dados cadastrais (e-mail, celular, nascimento) ficam em
 * `users/{uid}/private/profile`, que as regras do Firestore só liberam para
 * o dono. Outro usuário só recebe esses dados por aqui, e apenas se os dois
 * tiverem uma conversa individual ou um grupo em comum.
 */
router.get(
  '/:uid/profile',
  asyncHandler(async (req: Request, res: Response) => {
    const requester = requireUid(req);
    const target = req.params.uid;
    if (!isSafeId(target)) {
      throw new HttpError(400, 'Usuário inválido.');
    }

    if (!(await sharesConversation(requester, target))) {
      throw new HttpError(403, 'Vocês não têm uma conversa ou grupo em comum.');
    }

    const profile = await loadFullProfile(target);
    if (!profile) {
      throw new HttpError(404, 'Perfil não encontrado.');
    }
    res.json(profile);
  }),
);

export default router;
