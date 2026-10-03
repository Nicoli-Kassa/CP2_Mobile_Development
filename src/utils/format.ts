/** Formatações reutilizadas pela interface. */

/** Hora (HH:MM) exibida na bolha da mensagem. */
export function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Hora para mensagens de hoje, data curta para as mais antigas. */
export function formatConversationTime(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return formatMessageTime(timestamp);
  }
  return `${`${date.getDate()}`.padStart(2, '0')}/${`${date.getMonth() + 1}`.padStart(2, '0')}`;
}

/** Iniciais (no máximo duas letras). */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter((part) => part.length > 0);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Mantém só os dígitos (máx. 11) do celular digitado. */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11);
}

/** `11912345678` → `(11) 91234-5678`. Aceita entrada parcial enquanto a pessoa digita. */
export function formatPhone(digits: string): string {
  const d = phoneDigits(digits);
  if (d.length <= 2) {
    return d.length > 0 ? `(${d}` : '';
  }
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  const split = rest.length > 8 ? 5 : 4;
  if (rest.length <= split) {
    return `(${ddd}) ${rest}`;
  }
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

/** Máscara `DD/MM/AAAA` enquanto a pessoa digita. */
export function maskBirthDate(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) {
    return d;
  }
  if (d.length <= 4) {
    return `${d.slice(0, 2)}/${d.slice(2)}`;
  }
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** `AAAA-MM-DD` → `DD/MM/AAAA`. */
export function formatBirthDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : iso;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
