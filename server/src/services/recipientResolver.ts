import type { ConversationContext, DeviceTokenRecord, StoredMessage } from '../types/group';
import { isRecord, readString } from '../utils/parse';
import { adminFirestore } from './firebaseAdmin';

/**
 * Calcula no servidor quem deve receber o push. O aplicativo nunca envia a
 * lista de destinatários — ela sai só da conversa validada e da política
 * gravada no Firestore.
 *
 * Regras comuns a todas as políticas:
 *  - o remetente nunca recebe o próprio push;
 *  - só participantes/integrantes ATIVOS da conversa podem ser destinatários
 *    (uma menção a quem saiu do grupo é ignorada).
 */
export function resolveRecipientIds(context: ConversationContext, message: StoredMessage): string[] {
  if (context.type === 'direct') {
    // Conversas individuais sempre notificam o outro participante.
    return context.participantIds.filter((id) => id !== message.senderId);
  }

  const members = new Set(context.group.memberIds);
  const eligible = (id: string): boolean => members.has(id) && id !== message.senderId;

  switch (context.group.notificationPolicy) {
    case 'all_group_messages':
      return [...members].filter(eligible);

    case 'mentioned_members': {
      const targeted = message.target.type === 'member' ? [message.target.memberId] : [];
      return [...new Set([...message.mentionedUserIds, ...targeted])].filter(eligible);
    }

    case 'direct_messages_only':
    case 'disabled':
      return [];
  }
}

/** `true` quando o destinatário foi mencionado ou escolhido explicitamente. */
export function isAddressedTo(message: StoredMessage, userId: string): boolean {
  return (
    message.mentionedUserIds.includes(userId) ||
    (message.target.type === 'member' && message.target.memberId === userId)
  );
}

/** Tokens ativos (`enabled == true`) dos destinatários, lidos de `users/{uid}/devices`. */
export async function loadDeviceTokens(userIds: readonly string[]): Promise<DeviceTokenRecord[]> {
  const firestore = adminFirestore();
  const perUser = await Promise.all(
    userIds.map(async (userId) => {
      const snapshot = await firestore
        .collection('users')
        .doc(userId)
        .collection('devices')
        .where('enabled', '==', true)
        .get();
      return snapshot.docs.flatMap((doc): DeviceTokenRecord[] => {
        const raw: unknown = doc.data();
        const token = isRecord(raw) ? readString(raw, 'token') : null;
        return token ? [{ userId, deviceId: doc.id, token }] : [];
      });
    }),
  );
  return perUser.flat();
}

/** Desativa tokens que o serviço de push informou como inválidos. */
export async function disableDeviceTokens(devices: readonly DeviceTokenRecord[]): Promise<void> {
  if (devices.length === 0) {
    return;
  }
  const firestore = adminFirestore();
  const batch = firestore.batch();
  for (const device of devices) {
    batch.update(firestore.collection('users').doc(device.userId).collection('devices').doc(device.deviceId), {
      enabled: false,
      disabledReason: 'invalid_token',
      updatedAt: Date.now(),
    });
  }
  await batch.commit();
}
