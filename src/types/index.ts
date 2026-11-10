export type DishCategory = 'main' | 'dessert';

export type HotelVenue = 'Sala Pampulha' | 'Sala Tiradentes' | 'Restaurante';

export interface MenuItem {
  id: string;
  category: DishCategory;
  name: string;
  frenchTitle?: string;
  description: string;
  dietary: string[];
  chefNotes?: string;
  highlight?: string;
}

export interface EventConfig {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  time: string;
  location: HotelVenue; // Sempre Sala Pampulha, Sala Tiradentes ou Restaurante
  hotelName: string; // Sempre BH Raja Hotel
  hotelAddress: string;
  cnpj: string;
  accessCode: string;
  allowDessert: boolean; // Sobremesa ou não é uma configuração do evento
  defaultBeverageIncluded: boolean; // Sempre incluso 01 bebida não alcoólica
  welcomeMessage: string;
  activeDishes: MenuItem[];
  activeDesserts: MenuItem[];
}

export interface GuestOrder {
  id: string;
  code: string; // Ex: CMD-4091
  guestName: string;
  pinUsed: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: HotelVenue;
  mainDish: MenuItem;
  dessert?: MenuItem;
  beverageNotice: string;
  notes?: string;
  totalCost: number; // always 0.00
  createdAt: string;
  authCode: string;
}

export type ActiveTab = 'comanda' | 'admin' | 'event_config' | 'database';
