import { Router, type Request, type Response } from 'express';

import { requireUid } from '../middleware/authenticate';
import { loadConversationFor, loadMessage, loadUserName } from '../services/conversationAccess';
import { acquireDeliveryLock, completeDeliveryLock, releaseDeliveryLock } from '../services/deliveryLock';
import { logDeliveryReceipts, sendPushNotifications, type OutgoingPush } from '../services/notificationSender';
import {
  disableDeviceTokens,
  isAddressedTo,
  loadDeviceTokens,
  resolveRecipientIds,
} from '../services/recipientResolver';
import type { ConversationContext, StoredMessage } from '../types/group';
import { asyncHandler, HttpError } from '../utils/httpError';
import { isRecord, isSafeId } from '../utils/parse';

const router = Router();

/**
 * Texto do push: identifica a conversa sem expor o conteúdo da mensagem.
 */
function buildContent(
  context: ConversationContext,
  message: StoredMessage,
  senderName: string,
  recipientId: string,
): { title: string; body: string } {
  if (context.type === 'direct') {
    return { title: senderName, body: 'Enviou uma nova mensagem para você.' };
  }
  return {
    title: context.group.name,
    body: isAddressedTo(message, recipientId)
      ? `${senderName} mencionou você.`
      : `${senderName} enviou uma mensagem.`,
  };
}

/**
 * POST /notifications/messages
 * Body: { conversationId, messageId }
 *
 * 1. valida o Firebase ID Token (middleware);
 * 2. confirma no Realtime Database que a mensagem existe e que o remetente é o usuário autenticado;
 * 3. confirma no Firestore que o remetente participa da conversa;
 * 4. bloqueia reenvios da mesma mensagem (idempotência);
 * 5. calcula os destinatários pela política do Firestore e envia o push;
 * 6. desativa tokens inválidos.
 */
router.post(
  '/messages',
  asyncHandler(async (req: Request, res: Response) => {
    const uid = requireUid(req);
    const body: unknown = req.body;
    const conversationId = isRecord(body) ? body.conversationId : undefined;
    const messageId = isRecord(body) ? body.messageId : undefined;

    if (!isSafeId(conversationId) || !isSafeId(messageId)) {
      throw new HttpError(400, 'Informe conversationId e messageId válidos.');
    }

    const message = await loadMessage(conversationId, messageId);
    if (!message) {
      throw new HttpError(404, 'Mensagem não encontrada.');
    }
    if (message.senderId !== uid) {
      throw new HttpError(403, 'Somente o remetente pode solicitar o push desta mensagem.');
    }

    const context = await loadConversationFor(uid, conversationId);
    if (context.type !== message.conversationType) {
      throw new HttpError(400, 'Tipo da mensagem não corresponde à conversa.');
    }

    const lock = await acquireDeliveryLock(conversationId, messageId, uid);
    if (!lock.acquired) {
      res.status(200).json({ status: 'duplicate', message: 'Push desta mensagem já foi processado.' });
      return;
    }

    try {
      const recipientIds = resolveRecipientIds(context, message);
      const devices = await loadDeviceTokens(recipientIds);
      const senderName = await loadUserName(uid);

      const pushes: OutgoingPush[] = devices.map((device) => ({
        device,
        ...buildContent(context, message, senderName, device.userId),
        data: { conversationId, conversationType: context.type, messageId },
      }));

      const report = await sendPushNotifications(pushes);
      await disableDeviceTokens(report.invalidDevices);
      await completeDeliveryLock(lock.ref, {
        recipients: recipientIds.length,
        sent: report.sent,
        failed: report.failed,
      });

      const label = `${conversationId}/${messageId}`;
      console.log(
        `Push ${label}: política=${context.type === 'group' ? context.group.notificationPolicy : 'direct'} ` +
          `destinatários=${recipientIds.length} aparelhos=${devices.length} aceitos=${report.sent} recusados=${report.failed}`,
      );
      for (const reason of report.ticketErrors) {
        console.error(`Push ${label} recusado pelo Expo: ${reason}`);
      }
      logDeliveryReceipts(report.ticketIds, label);

      res.status(200).json({
        status: 'processed',
        policy: context.type === 'group' ? context.group.notificationPolicy : 'direct',
        recipients: recipientIds.length,
        sent: report.sent,
        failed: report.failed,
        invalidTokensDisabled: report.invalidDevices.length,
      });
    } catch (error) {
      await releaseDeliveryLock(lock.ref);
      throw error;
    }
  }),
);

export default router;
