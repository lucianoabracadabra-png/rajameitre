import type { EventConfig, GuestOrder, MenuItem, AuditLogEntry, StaffUser } from '../types';
import {
  MASTER_MENU_DATABASE,
  INITIAL_EVENTS,
  INITIAL_ORDERS,
  INITIAL_AUDIT_LOGS,
} from '../data/menuDatabase';
import { getSupabaseClient } from './supabase';
import { normalizePassword } from '../utils/formatters';

/* ------------------------------ Maître & Equipe ------------------------------ */

export const VALID_CREDENTIALS: Record<string, string> = {
  FSOUZA: '1234@abcd',
  LAUGUSTO: '1234@abcd',
  GILSON: '1234@abcd',
};

const STORAGE_KEYS = {
  SESSION: 'garcon_staff_session',
  EVENTS: 'garcon_events',
  ACTIVE_EVENT_ID: 'garcon_active_event_id',
  ORDERS: 'garcon_orders',
  MASTER_DB: 'garcon_master_database',
  AUDIT_LOGS: 'garcon_audit_logs',
};

export type StaffSignInResult =
  | { ok: true; user: StaffUser }
  | { ok: false; error: 'bad_credentials' };

export async function staffSignIn(username: string, password: string): Promise<StaffSignInResult> {
  const cleanUser = username.trim().toUpperCase() as StaffUser;
  const cleanPass = password.trim();

  if (VALID_CREDENTIALS[cleanUser] && VALID_CREDENTIALS[cleanUser] === cleanPass) {
    sessionStorage.setItem(STORAGE_KEYS.SESSION, cleanUser);
    addAuditLog(cleanUser, 'LOGIN_MAITRE', `Acesso autenticado ao painel pelo usuário ${cleanUser}.`);
    return { ok: true, user: cleanUser };
  }

  return { ok: false, error: 'bad_credentials' };
}

export async function staffSignOut(): Promise<void> {
  const current = getStaffSession();
  if (current) {
    addAuditLog(current, 'LOGOUT_MAITRE', `Sessão encerrada pelo usuário ${current}.`);
  }
  sessionStorage.removeItem(STORAGE_KEYS.SESSION);
}

export function getStaffSession(): StaffUser | null {
  const user = sessionStorage.getItem(STORAGE_KEYS.SESSION);
  if (user && user in VALID_CREDENTIALS) {
    return user as StaffUser;
  }
  return null;
}

export async function hasStaffSession(): Promise<boolean> {
  return getStaffSession() !== null;
}

/* ------------------------------ Estado & Persistência (com Supabase) ------------------------------ */

export function loadEvents(): EventConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EVENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Erro ao ler eventos:', e);
  }
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(INITIAL_EVENTS));
  return INITIAL_EVENTS;
}

export function saveEvents(events: EventConfig[], author: string = 'SISTEMA'): void {
  const limited = events.slice(0, 4);
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(limited));

  // Sync to Supabase in background
  const client = getSupabaseClient();
  if (client) {
    void client
      .from('app_state')
      .upsert([
        { key: 'events', value: limited, updated_at: new Date().toISOString() },
        { key: 'event_config', value: limited[0] || null, updated_at: new Date().toISOString() },
      ])
      .then(
        ({ error }: any) => {
          if (error) console.warn('Supabase sync (events):', error.message);
        },
        (e: any) => console.warn('Supabase sync failed (events):', e)
      );
  }
}

export function getActiveEventId(): string {
  const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_EVENT_ID);
  if (stored) return stored;
  const events = loadEvents();
  return events[0]?.id || 'evt-raja-1';
}

export function setActiveEventId(id: string): void {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_EVENT_ID, id);
}

export function loadMasterDatabase(): MenuItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MASTER_DB);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Erro ao ler acervo:', e);
  }
  localStorage.setItem(STORAGE_KEYS.MASTER_DB, JSON.stringify(MASTER_MENU_DATABASE));
  return MASTER_MENU_DATABASE;
}

export function saveMasterDatabase(items: MenuItem[]): void {
  localStorage.setItem(STORAGE_KEYS.MASTER_DB, JSON.stringify(items));

  // Sync to Supabase in background
  const client = getSupabaseClient();
  if (client) {
    void client
      .from('app_state')
      .upsert({
        key: 'master_database',
        value: items,
        updated_at: new Date().toISOString(),
      })
      .then(
        ({ error }: any) => {
          if (error) console.warn('Supabase sync (master_database):', error.message);
        },
        (e: any) => console.warn('Supabase sync failed (master_database):', e)
      );
  }
}

export function loadOrders(): GuestOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Erro ao ler pedidos:', e);
  }
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
  return INITIAL_ORDERS;
}

export function saveOrders(orders: GuestOrder[]): void {
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
}

export function insertOrder(order: GuestOrder): void {
  const current = loadOrders();
  const updated = [order, ...current];
  saveOrders(updated);

  // Sync to Supabase orders table for permanent storage & analytics
  const client = getSupabaseClient();
  if (client) {
    void client
      .from('orders')
      .upsert({
        id: order.id,
        data: order,
        created_at: new Date().toISOString(),
      })
      .then(
        ({ error }: any) => {
          if (error) console.warn('Supabase sync (insertOrder):', error.message);
        },
        (e: any) => console.warn('Supabase sync failed (insertOrder):', e)
      );
  }
}

export function deleteOrder(orderId: string, author: string): boolean {
  const current = loadOrders();
  const target = current.find((o) => o.id === orderId);
  if (!target) return false;

  const updated = current.filter((o) => o.id !== orderId);
  saveOrders(updated);

  // Sync delete to Supabase
  const client = getSupabaseClient();
  if (client) {
    void client
      .from('orders')
      .delete()
      .eq('id', orderId)
      .then(
        ({ error }: any) => {
          if (error) console.warn('Supabase sync (deleteOrder):', error.message);
        },
        (e: any) => console.warn('Supabase sync failed (deleteOrder):', e)
      );
  }

  addAuditLog(
    author,
    'EXCLUSÃO_COMANDA',
    `Comanda ${target.code} de "${target.guestName}" foi excluída do evento "${target.eventTitle}".`
  );
  return true;
}

/* ------------------------------ Histórico de Auditoria ------------------------------ */

export function loadAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Erro ao ler logs:', e);
  }
  localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
  return INITIAL_AUDIT_LOGS;
}

export function addAuditLog(author: string, action: string, details: string): void {
  const current = loadAuditLogs();
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const newLog: AuditLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: `${dateStr} ${timeStr}`,
    author: author || 'MAÎTRE',
    action,
    details,
  };

  const updated = [newLog, ...current];
  localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(updated.slice(0, 200)));

  // Sync audit logs to Supabase
  const client = getSupabaseClient();
  if (client) {
    void client
      .from('app_state')
      .upsert({
        key: 'audit_logs',
        value: updated.slice(0, 200),
        updated_at: new Date().toISOString(),
      })
      .then(
        ({ error }: any) => {
          if (error) console.warn('Supabase sync (audit_logs):', error.message);
        },
        (e: any) => console.warn('Supabase sync failed (audit_logs):', e)
      );
  }
}

/**
 * Tenta sincronizar os dados do Supabase na inicialização
 */
export async function syncFromSupabase(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { data: stateData } = await client.from('app_state').select('key, value');
    if (stateData && Array.isArray(stateData)) {
      const eventsRow = stateData.find((r) => r.key === 'events');
      if (eventsRow && Array.isArray(eventsRow.value) && eventsRow.value.length > 0) {
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(eventsRow.value));
      }

      const masterRow = stateData.find((r) => r.key === 'master_database');
      if (masterRow && Array.isArray(masterRow.value) && masterRow.value.length > 0) {
        localStorage.setItem(STORAGE_KEYS.MASTER_DB, JSON.stringify(masterRow.value));
      }

      const auditRow = stateData.find((r) => r.key === 'audit_logs');
      if (auditRow && Array.isArray(auditRow.value)) {
        localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditRow.value));
      }
    }

    const { data: ordersData } = await client
      .from('orders')
      .select('data')
      .order('created_at', { ascending: false });

    if (ordersData && Array.isArray(ordersData) && ordersData.length > 0) {
      const mapped = ordersData.map((r) => r.data as GuestOrder).filter(Boolean);
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(mapped));
    }

    return true;
  } catch (err) {
    console.warn('Sincronização com Supabase encontrou falha temporária:', err);
    return false;
  }
}

/* ----------------------------- Convidado & Validação ---------------------------- */

export type SubmitOrderResult =
  | { ok: true }
  | { ok: false; error: 'bad_code' | 'no_event' | 'invalid' };

export async function submitOrder(order: GuestOrder, inputCode: string): Promise<SubmitOrderResult> {
  const events = loadEvents();
  const targetEvent = events.find((e) => e.id === order.eventId) || events[0];

  if (!targetEvent) {
    return { ok: false, error: 'no_event' };
  }

  // Normaliza senha (remove barras e espaços para bater sem punir o convidado)
  const normExpected = normalizePassword(targetEvent.accessCode);
  const normInput = normalizePassword(inputCode);

  if (normExpected !== normInput) {
    return { ok: false, error: 'bad_code' };
  }

  insertOrder(order);
  return { ok: true };
}

/* ------------------------------ Tradução com IA & Fallback ------------------------------ */

export async function translateTextWithAI(
  text: string,
  targetLang: 'en' | 'pt' = 'en',
  context: 'dish' | 'event_description' = 'dish'
): Promise<string> {
  if (!text || !text.trim()) return '';

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim(), targetLang, context }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.translatedText) {
        return data.translatedText;
      }
    }
  } catch (e) {
    console.warn('Endpoint /api/translate indisponível, gerando via motor culinário:', e);
  }

  // Fallback culinário instantâneo no cliente
  return localGastronomicTranslate(text);
}

function localGastronomicTranslate(text: string): string {
  const dictionary: [RegExp, string][] = [
    [/tornedor de fil[eé] mignon/gi, 'Prime beef filet mignon tournedos'],
    [/fil[eé] mignon/gi, 'Filet mignon'],
    [/manteiga de ervas nobres|manteiga de ervas/gi, 'fine herb butter'],
    [/mousseline aveludada de mandioca/gi, 'velvety cassava mousseline'],
    [/trufas negras/gi, 'black truffles'],
    [/folha de ouro 24k/gi, '24k gold leaf'],
    [/folha de ouro/gi, 'gold leaf'],
    [/demi-glace laqueada ao vinho tinto de altitude/gi, 'high-altitude red wine glazed demi-glace'],
    [/vinho tinto/gi, 'red wine'],
    [/robalo chileno/gi, 'Chilean sea bass'],
    [/lombo de robalo selvagem/gi, 'wild sea bass loin'],
    [/crosta crocante de pistaches torrados/gi, 'crispy roasted pistachio crust'],
    [/crosta de pistache/gi, 'pistachio crust'],
    [/velout[eé] de a[çc]afr[ãa]o espanhol/gi, 'velvety Spanish saffron velouté'],
    [/mini cenouras glaceadas/gi, 'glazed baby carrots'],
    [/risoto de tartufo nero/gi, 'black truffle risotto'],
    [/cogumelos silvestres da serra|cogumelos da serra/gi, 'wild mountain mushrooms'],
    [/azeite de ervas finas/gi, 'fine herb olive oil'],
    [/gnocchi artesanal de ab[oó]bora caboti[aá]/gi, 'handmade roasted kabocha squash gnocchi'],
    [/fonduta bot[aâ]nica de castanhas do cerrado/gi, 'botanical cerrado nut fondue'],
    [/nozes pecan caramelizadas/gi, 'candied pecans'],
    [/mille-feuille imp[eé]rial de baunilha bourbon/gi, 'Imperial Madagascar Bourbon vanilla mille-feuille'],
    [/creme diplomata/gi, 'diplomat cream'],
    [/pavlova tropical de frutas nobres/gi, 'tropical noble fruit pavlova'],
    [/mousse noir 80%/gi, 'whipped 80% grand cru dark chocolate mousse'],
    [/azeite frutado extra virgem/gi, 'fruity extra virgin olive oil'],
    [/flor de sal de gu[eé]rande/gi, 'Guérande fleur de sel'],
    [/mirtilos frescos/gi, 'fresh blueberries'],
  ];

  let output = text;
  for (const [pt, en] of dictionary) {
    output = output.replace(pt, en);
  }
  return output;
}
