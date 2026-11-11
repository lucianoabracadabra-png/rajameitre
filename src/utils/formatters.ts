export function generateOrderCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `CMD-${num}`;
}

export function generateAuthHash(guestName: string, eventTitle: string): string {
  const chars = 'ABCDEF0123456789';
  let hash = '';
  for (let i = 0; i < 16; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
    if ((i + 1) % 4 === 0 && i !== 15) hash += '-';
  }
  return `RAJ-${hash}`;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

export function getCurrentTimeFormatted(): string {
  const now = new Date();
  return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function getCurrentDateFormatted(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Senha de acesso do evento sem barras "/":
 * Regra: mês + dia + @ + 3 primeiros caracteres maiúsculos do título
 * Ex: Novembro (11), Dia 23 (23), Título "Summit Jurídico" => 1123@SUM
 */
export function generateEventPassword(title: string, dateInput?: string): string {
  const now = new Date();
  let month = String(now.getMonth() + 1).padStart(2, '0');
  let day = String(now.getDate()).padStart(2, '0');

  if (dateInput) {
    // Detect ISO YYYY-MM-DD
    const isoMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      month = isoMatch[2];
      day = isoMatch[3];
    } else {
      const slashMatch = dateInput.match(/(\d{1,2})[\/\-](\d{1,2})/);
      if (slashMatch) {
        const p1 = parseInt(slashMatch[1], 10);
        const p2 = parseInt(slashMatch[2], 10);
        if (p2 <= 12 && p1 <= 31) {
          day = String(p1).padStart(2, '0');
          month = String(p2).padStart(2, '0');
        } else if (p1 <= 12 && p2 <= 31) {
          month = String(p1).padStart(2, '0');
          day = String(p2).padStart(2, '0');
        }
      }
    }
  }

  const normalized = (title || 'EVT')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();

  const prefix = (normalized.slice(0, 3) || 'EVT').padEnd(3, 'X');
  return `${month}${day}@${prefix}`;
}

/**
 * Normaliza senha para comparação (remove barras, espaços e torna maiúscula)
 */
export function normalizePassword(pass: string): string {
  return pass.replace(/[\/\s]/g, '').toUpperCase();
}

/**
 * Formata data por extenso:
 * PT-BR: "Dia 23 de novembro de 2026"
 * EN-US: "November 23, 2026"
 */
export function formatDateFullExtenso(dateStr: string, lang: 'pt' | 'en' = 'pt'): string {
  if (!dateStr) return '';

  let year = 2026;
  let month = 11;
  let day = 14;

  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    year = parseInt(iso[1], 10);
    month = parseInt(iso[2], 10);
    day = parseInt(iso[3], 10);
  } else {
    const br = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?/);
    if (br) {
      day = parseInt(br[1], 10);
      month = parseInt(br[2], 10);
      if (br[3]) year = parseInt(br[3], 10);
    }
  }

  const monthsPt = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];

  const monthsEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const mIdx = Math.max(0, Math.min(11, month - 1));

  if (lang === 'en') {
    return `${monthsEn[mIdx]} ${day}, ${year}`;
  }

  return `Dia ${day} de ${monthsPt[mIdx]} de ${year}`;
}

/**
 * Formata horário de almoço por extenso:
 * De 2 horários (timeStart: "11:30", timeEnd: "14:30")
 * Para: "11h30 às 14h30" (ou "11:30 AM to 2:30 PM")
 */
export function formatTimeRangeExtenso(
  timeStart: string = '11:30',
  timeEnd: string = '14:30',
  lang: 'pt' | 'en' = 'pt'
): string {
  const cleanStart = timeStart.trim() || '11:30';
  const cleanEnd = timeEnd.trim() || '14:30';

  if (lang === 'en') {
    const formatAmPm = (t: string) => {
      const parts = t.split(':');
      let h = parseInt(parts[0], 10) || 12;
      const m = parts[1] || '00';
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h}:${m} ${ampm}`;
    };
    return `${formatAmPm(cleanStart)} to ${formatAmPm(cleanEnd)}`;
  }

  // PT-BR: "11h30 às 14h30"
  const startFmt = cleanStart.replace(':', 'h');
  const endFmt = cleanEnd.replace(':', 'h');
  return `${startFmt} às ${endFmt}`;
}

/**
 * Formata telefone com regras automáticas:
 * DDD padrão 31
 * - 8 dígitos: prefixa DDD 31 + dígito 9 -> (31) 9 XXXX-XXXX
 * - 9 dígitos: prefixa DDD 31 -> (31) X XXXX-XXXX
 * - 10 dígitos (já com DDD): adiciona dígito 9 -> (31) 9 XXXX-XXXX
 * - 11 dígitos (com DDD e 9): organiza (31) 9 XXXX-XXXX
 */
export function formatBrazilianPhone(input: string): string {
  if (!input) return '';
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';

  // 8 dígitos digitados (ex: 98765432) -> (31) 9 9876-5432
  if (digits.length === 8) {
    return `(31) 9 ${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  // 9 dígitos digitados (ex: 998765432) -> (31) 9 9876-5432
  if (digits.length === 9) {
    const first = digits[0];
    const part1 = digits.slice(1, 5);
    const part2 = digits.slice(5);
    return `(31) ${first} ${part1}-${part2}`;
  }

  // 10 dígitos digitados com DDD sem o 9 (ex: 31 87654321) -> (31) 9 8765-4321
  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);
    return `(${ddd}) 9 ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }

  // 11 dígitos digitados completos (ex: 31 998765432) -> (31) 9 9876-5432
  if (digits.length === 11) {
    const ddd = digits.slice(0, 2);
    const nine = digits[2];
    const part1 = digits.slice(3, 7);
    const part2 = digits.slice(7);
    return `(${ddd}) ${nine} ${part1}-${part2}`;
  }

  // Formatação parcial enquanto digita
  if (digits.length > 2) {
    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);
    if (rest.length <= 5) return `(${ddd}) ${rest}`;
    return `(${ddd}) ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`;
  }

  return digits;
}
