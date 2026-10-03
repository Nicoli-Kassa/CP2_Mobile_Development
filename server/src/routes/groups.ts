import { Router, type Request, type Response } from 'express';

import { requireUid } from '../middleware/authenticate';
import { loadGroup } from '../services/conversationAccess';
import { adminDatabase } from '../services/firebaseAdmin';
import { asyncHandler, HttpError } from '../utils/httpError';
import { isSafeId } from '../utils/parse';

const router = Router();

/**
 * POST /groups/:groupId/sync-members
 *
 * O Firestore é a fonte da verdade dos integrantes, mas as regras do
 * Realtime Database não conseguem consultar o Firestore. Por isso a API
 * copia `memberIds` para `groupMembers/{groupId}` no Realtime Database,
 * que é o caminho usado pelas regras das mensagens.
 *
 * Esse espelho só pode ser escrito pelo Admin SDK (`.write: false` para
 * clientes). Quando alguém é removido, o espelho é refeito sem o `uid` e o
 * Realtime Database passa a negar leitura e envio de novas mensagens.
 */
router.post(
  '/:groupId/sync-members',
  asyncHandler(async (req: Request, res: Response) => {
    const uid = requireUid(req);
    const groupId = req.params.groupId;
    if (!isSafeId(groupId) || groupId.includes('_')) {
      throw new HttpError(400, 'Grupo inválido.');
    }

    const mirrorRef = adminDatabase().ref(`groupMembers/${groupId}`);
    const group = await loadGroup(groupId);

    if (!group) {
      await mirrorRef.remove();
      throw new HttpError(404, 'Grupo não encontrado.');
    }
    if (group.ownerId !== uid && !group.memberIds.includes(uid)) {
      throw new HttpError(403, 'Você não é integrante deste grupo.');
    }

    const members: Record<string, true> = {};
    for (const memberId of group.memberIds) {
      if (isSafeId(memberId)) {
        members[memberId] = true;
      }
    }
    await mirrorRef.set(members);

    res.json({ status: 'synced', members: Object.keys(members).length });
  }),
);

export default router;
