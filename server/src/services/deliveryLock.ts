import type { DocumentReference } from 'firebase-admin/firestore';

import { adminFirestore } from './firebaseAdmin';

/**
 * Proteção contra chamadas duplicadas.
 *
 * `create()` do Firestore é atômico: falha com ALREADY_EXISTS se o documento
 * já existir. Duas requisições para a mesma mensagem — reenvio ou chamadas
 * simultâneas — só conseguem criar o documento uma vez, então só uma delas
 * envia o push.
 *
 * A coleção `notificationDeliveries` é fechada para os clientes nas regras
 * do Firestore; só a API (Admin SDK) escreve nela.
 */

const ALREADY_EXISTS = 6;

export type DeliveryLock = { acquired: true; ref: DocumentReference } | { acquired: false };

function hasGrpcCode(error: unknown, code: number): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

export async function acquireDeliveryLock(
  conversationId: string,
  messageId: string,
  requestedBy: string,
): Promise<DeliveryLock> {
  const ref = adminFirestore().collection('notificationDeliveries').doc(`${conversationId}__${messageId}`);
  try {
    await ref.create({ conversationId, messageId, requestedBy, status: 'processing', createdAt: Date.now() });
    return { acquired: true, ref };
  } catch (error) {
    if (hasGrpcCode(error, ALREADY_EXISTS)) {
      return { acquired: false };
    }
    throw error;
  }
}

/** Libera o lock quando o envio falhou, para que o app possa tentar de novo. */
export async function releaseDeliveryLock(ref: DocumentReference): Promise<void> {
  await ref.delete();
}

export async function completeDeliveryLock(
  ref: DocumentReference,
  result: { recipients: number; sent: number; failed: number },
): Promise<void> {
  await ref.update({ status: 'sent', ...result, completedAt: Date.now() });
}
