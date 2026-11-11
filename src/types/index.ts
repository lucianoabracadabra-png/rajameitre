export type DishCategory = 'main' | 'dessert';

export type HotelVenue = 'Sala Pampulha' | 'Sala Tiradentes' | 'Restaurante' | 'Espaço Panorâmico';

export const VENUE_TRANSLATIONS: Record<HotelVenue, { pt: string; en: string }> = {
  'Sala Pampulha': { pt: 'Sala Pampulha', en: 'Pampulha Hall' },
  'Sala Tiradentes': { pt: 'Sala Tiradentes', en: 'Tiradentes Hall' },
  'Restaurante': { pt: 'Restaurante', en: 'Restaurant' },
  'Espaço Panorâmico': { pt: 'Espaço Panorâmico', en: 'Panoramic Space' },
};

export const ALLOWED_DIETARY_TAGS = [
  'Vegano',
  'Vegetariano',
  'Sem glúten',
  'Sem Lactose',
  'Zero açúcar',
  'Sem adição de açúcar',
] as const;

export type DietaryTag = (typeof ALLOWED_DIETARY_TAGS)[number];

export interface MenuItem {
  id: string;
  category: DishCategory;
  name: string; // Apenas um único nome
  description: string;
  descriptionEn?: string; // Slot editável de tradução em inglês
  dietary: string[];
  chefNotes?: string;
  highlight?: string;
}

export interface EventConfig {
  id: string;
  slug?: string; // ex: 'eve1', 'eve2', 'eve3', 'eve4' para link direto e QR Code
  title: string; // NUNCA traduzido por IA
  subtitle: string;
  subtitleEn?: string; // Slot editável de tradução em inglês
  date: string; // Formato YYYY-MM-DD para calendário
  time: string; // "11h30 às 14h30"
  timeStart?: string; // "11:30" (reloginho início)
  timeEnd?: string; // "14:30" (reloginho término)
  location: HotelVenue;
  hotelName: string;
  hotelAddress: string;
  cnpj: string;
  accessCode: string; // MMDD@XXX (sem barras)
  allowDessert: boolean;
  defaultBeverageIncluded: boolean; // 01 und
  totalReservations: number; // Ex: 80 reservas feitas
  coordinatorName?: string; // Visível apenas para o maitre
  coordinatorPhone?: string; // Visível apenas para o maitre
  welcomeMessage: string;
  welcomeMessageEn?: string;
  activeDishes: MenuItem[];
  activeDesserts: MenuItem[];
}

export interface GuestOrder {
  id: string;
  code: string; // Ex: CMD-4091
  eventId: string;
  guestName: string;
  pinUsed: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: HotelVenue;
  mainDish: MenuItem;
  dessert?: MenuItem;
  beverageNotice: string; // '01 Bebida Não Alcoólica (01 und) Inclusa'
  notes?: string;
  totalCost: number; // 0.00
  createdAt: string;
  authCode: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  author: string; // FSOUZA, LAUGUSTO, GILSON
  action: string;
  details: string;
}

export type StaffUser = 'FSOUZA' | 'LAUGUSTO' | 'GILSON';

export type LanguageMode = 'pt' | 'en';

export type ActiveTab = 'comanda' | 'admin' | 'event_config' | 'database' | 'audit_log';
