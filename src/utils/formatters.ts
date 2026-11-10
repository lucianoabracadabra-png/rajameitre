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
  return now.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
