import type { DeviceTokenRecord } from '../types/group';
import { isRecord, readString } from '../utils/parse';

/**
 * Envio pelo Expo Push Service.
 *
 * O Expo entrega no Android pelo Firebase Cloud Messaging (usando a chave
 * FCM V1 do projeto cadastrada no EAS) e no iOS pelo APNs. A API só envia
 * para tokens `ExponentPushToken[...]` gravados pelo app no Firestore.
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
/** Os recibos ficam prontos alguns segundos depois do envio. */
const RECEIPT_DELAY_MS = 15000;
const EXPO_BATCH_SIZE = 100;

export type PushData = {
  conversationId: string;
  conversationType: 'direct' | 'group';
  messageId: string;
};

export type OutgoingPush = {
  device: DeviceTokenRecord;
  title: string;
  body: string;
  data: PushData;
};

export type SendReport = {
  sent: number;
  failed: number;
  /** Tokens que devem ser desativados (DeviceNotRegistered ou formato inválido). */
  invalidDevices: DeviceTokenRecord[];
  /** IDs dos tickets aceitos, usados para consultar os recibos de entrega. */
  ticketIds: string[];
  /** Motivo de cada ticket recusado (`ERRO: mensagem`), para o log. */
  ticketErrors: string[];
};

const EXPO_TOKEN_PATTERN = /^Expo(nent)?PushToken\[.+\]$/;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

type Ticket = { ok: true; id: string | null } | { ok: false; deviceNotRegistered: boolean; reason: string };

function parseTickets(body: unknown, expected: number): Ticket[] {
  const data = isRecord(body) && Array.isArray(body.data) ? body.data : [];
  return Array.from({ length: expected }, (_, index): Ticket => {
    const ticket: unknown = data[index];
    if (isRecord(ticket) && readString(ticket, 'status') === 'ok') {
      return { ok: true, id: readString(ticket, 'id') };
    }
    const details = isRecord(ticket) && isRecord(ticket.details) ? ticket.details : {};
    const error = readString(details, 'error') ?? 'sem ticket';
    const message = isRecord(ticket) ? (readString(ticket, 'message') ?? '') : '';
    return { ok: false, deviceNotRegistered: error === 'DeviceNotRegistered', reason: `${error}: ${message}`.slice(0, 200) };
  });
}

type ExpoRequestError = { code: string; message: string; details: unknown };

/** Primeiro erro de requisição devolvido pelo Expo (`{ errors: [{ code, message, details }] }`). */
function parseRequestError(body: unknown): ExpoRequestError | null {
  const errors = isRecord(body) && Array.isArray(body.errors) ? body.errors : [];
  const first: unknown = errors[0];
  if (!isRecord(first)) {
    return null;
  }
  return { code: readString(first, 'code') ?? '', message: readString(first, 'message') ?? '', details: first.details };
}

/**
 * `PUSH_TOO_MANY_EXPERIENCE_IDS`: o lote mistura tokens de projetos Expo
 * diferentes (ex.: aparelhos registrados por outra versão do app). O Expo
 * devolve em `details` os tokens agrupados por projeto; cada grupo é
 * reenviado separadamente, como recomenda a documentação do Expo.
 */
function splitByProject(batch: readonly OutgoingPush[], details: unknown): OutgoingPush[][] {
  if (!isRecord(details)) {
    return [];
  }
  return Object.values(details)
    .map((tokens) => {
      const set = new Set(Array.isArray(tokens) ? tokens.filter((t): t is string => typeof t === 'string') : []);
      return batch.filter((message) => set.has(message.device.token));
    })
    .filter((group) => group.length > 0);
}

async function sendBatch(
  batch: readonly OutgoingPush[],
  headers: Record<string, string>,
  report: SendReport,
  allowSplit = true,
): Promise<void> {
  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(
      batch.map((message) => ({
        to: message.device.token,
        title: message.title,
        body: message.body,
        data: message.data,
        sound: 'default',
        priority: 'high',
        channelId: 'messages',
      })),
    ),
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const requestError = parseRequestError(body);
    if (allowSplit && requestError?.code === 'PUSH_TOO_MANY_EXPERIENCE_IDS') {
      const groups = splitByProject(batch, requestError.details);
      if (groups.length > 1) {
        for (const group of groups) {
          await sendBatch(group, headers, report, false);
        }
        return;
      }
    }
    const reason = requestError ? ` (${requestError.code}: ${requestError.message.slice(0, 300)})` : '';
    throw new Error(`Expo Push Service respondeu ${response.status}${reason}.`);
  }

  parseTickets(body, batch.length).forEach((ticket, index) => {
    if (ticket.ok) {
      report.sent += 1;
      if (ticket.id) {
        report.ticketIds.push(ticket.id);
      }
      return;
    }
    report.failed += 1;
    report.ticketErrors.push(ticket.reason);
    if (ticket.deviceNotRegistered) {
      report.invalidDevices.push(batch[index].device);
    }
  });
}

export async function sendPushNotifications(messages: readonly OutgoingPush[]): Promise<SendReport> {
  const report: SendReport = { sent: 0, failed: 0, invalidDevices: [], ticketIds: [], ticketErrors: [] };

  const valid = messages.filter((message) => {
    if (EXPO_TOKEN_PATTERN.test(message.device.token)) {
      return true;
    }
    report.invalidDevices.push(message.device);
    report.failed += 1;
    return false;
  });

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (process.env.EXPO_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }

  for (const batch of chunk(valid, EXPO_BATCH_SIZE)) {
    await sendBatch(batch, headers, report);
  }

  return report;
}

/**
 * Recibos de entrega: o ticket só diz que o Expo aceitou o push; o recibo diz
 * se o FCM/APNs entregou. Erros como InvalidCredentials (credencial FCM V1
 * ausente no EAS) ou MismatchSenderId só aparecem aqui. A consulta roda em
 * segundo plano, depois da resposta ao app, e só escreve no log.
 */
export function logDeliveryReceipts(ticketIds: readonly string[], label: string): void {
  if (ticketIds.length === 0) {
    return;
  }
  const timer = setTimeout(() => {
    void (async () => {
      try {
        const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' };
        if (process.env.EXPO_ACCESS_TOKEN) {
          headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
        }
        const response = await fetch(EXPO_RECEIPTS_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify({ ids: ticketIds }),
        });
        const body: unknown = await response.json().catch(() => null);
        const receipts = isRecord(body) && isRecord(body.data) ? body.data : {};
        let delivered = 0;
        const problems: string[] = [];
        for (const id of ticketIds) {
          const receipt: unknown = receipts[id];
          if (!isRecord(receipt)) {
            problems.push('recibo ainda indisponível');
          } else if (readString(receipt, 'status') === 'ok') {
            delivered += 1;
          } else {
            const details = isRecord(receipt.details) ? receipt.details : {};
            problems.push(`${readString(details, 'error') ?? 'erro'}: ${(readString(receipt, 'message') ?? '').slice(0, 200)}`);
          }
        }
        console.log(`Recibos ${label}: entregues ao FCM/APNs=${delivered}/${ticketIds.length}`);
        for (const problem of problems) {
          console.error(`Recibo ${label} com falha: ${problem}`);
        }
      } catch (error) {
        console.error(`Recibos ${label}: consulta falhou:`, error instanceof Error ? error.message : error);
      }
    })();
  }, RECEIPT_DELAY_MS);
  timer.unref();
}
