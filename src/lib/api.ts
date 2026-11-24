import type {
  EventConfig,
  GuestOrder,
  MenuItem,
  AuditLogEntry,
  StaffUser,
  StaffRole,
  StaffSession,
  EventAnalyticsRecord,
  OrderStatus,
  OrderTransactionEntry,
} from '../types';
import {
  MASTER_MENU_DATABASE,
  INITIAL_EVENTS,
  INITIAL_ORDERS,
  INITIAL_AUDIT_LOGS,
} from '../data/menuDatabase';
import { getSupabaseClient } from './supabase';
import { normalizePassword, formatEventCountdown } from '../utils/formatters';

/* ------------------------------ Maître & Equipe ------------------------------ */

export const VALID_CREDENTIALS: Record<string, string> = {
  FSOUZA: '1234@abcd',
  LAUGUSTO: '1234@abcd',
  GILSON: '1234@abcd',
};

export const WAITER_PASSWORD = '1234@GAR';

const STORAGE_KEYS = {
  SESSION: 'garcon_staff_session',
  EVENTS_LIBRARY: 'garcon_events_library',
  CAIXA_SLOTS: 'garcon_caixa_slots',
  EVENTS: 'garcon_events',
  ACTIVE_EVENT_ID: 'garcon_active_event_id',
  ORDERS: 'garcon_orders',
  MASTER_DB: 'garcon_master_database',
  AUDIT_LOGS: 'garcon_audit_logs',
};

export interface CaixaSlot {
  slotNumber: number; // 1, 2, 3, 4
  slotKey: 'slot1' | 'slot2' | 'slot3' | 'slot4';
  slug: string; // 'eve1', 'eve2', 'eve3', 'eve4'
  eventId: string | null;
}

export const DEFAULT_SLOTS: CaixaSlot[] = [
  { slotNumber: 1, slotKey: 'slot1', slug: 'eve1', eventId: 'evt-raja-1' },
  { slotNumber: 2, slotKey: 'slot2', slug: 'eve2', eventId: 'evt-raja-2' },
  { slotNumber: 3, slotKey: 'slot3', slug: 'eve3', eventId: 'evt-raja-3' },
  { slotNumber: 4, slotKey: 'slot4', slug: 'eve4', eventId: 'evt-raja-4' },
];

export type StaffSignInResult =
  | { ok: true; session: StaffSession }
  | { ok: false; error: 'bad_credentials' | 'missing_name' };

export async function staffSignIn(
  username: string,
  password: string,
  mode: StaffRole = 'maitre'
): Promise<StaffSignInResult> {
  const cleanUser = username.trim().toUpperCase();
  const cleanPass = password.trim();

  if (mode === 'waiter') {
    if (!cleanUser) {
      return { ok: false, error: 'missing_name' };
    }
    if (cleanPass === WAITER_PASSWORD) {
      const session: StaffSession = { username: cleanUser, role: 'waiter' };
      sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
      addAuditLog(cleanUser, 'LOGIN_GARCOM', `Garçom "${cleanUser}" acessou o sistema de entregas.`);
      return { ok: true, session };
    }
    return { ok: false, error: 'bad_credentials' };
  }

  if (VALID_CREDENTIALS[cleanUser] && VALID_CREDENTIALS[cleanUser] === cleanPass) {
    const session: StaffSession = { username: cleanUser as StaffUser, role: 'maitre' };
    sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    addAuditLog(cleanUser, 'LOGIN_MAITRE', `Acesso autenticado ao painel pelo usuário ${cleanUser}.`);
    return { ok: true, session };
  }

  return { ok: false, error: 'bad_credentials' };
}

export async function staffSignOut(): Promise<void> {
  const current = getStaffSession();
  if (current) {
    addAuditLog(
      current.username,
      current.role === 'waiter' ? 'LOGOUT_GARCOM' : 'LOGOUT_MAITRE',
      `Sessão encerrada por ${current.username}.`
    );
  }
  sessionStorage.removeItem(STORAGE_KEYS.SESSION);
}

export function getStaffSession(): StaffSession | null {
  const raw = sessionStorage.getItem(STORAGE_KEYS.SESSION);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.username === 'string' &&
      (parsed.role === 'maitre' || parsed.role === 'waiter')
    ) {
      return parsed as StaffSession;
    }
  } catch {
    // Fallback para sessões antigas salvas como string pura
    if (raw in VALID_CREDENTIALS) {
      return { username: raw, role: 'maitre' };
    }
  }
  return null;
}

export async function hasStaffSession(): Promise<boolean> {
  return getStaffSession() !== null;
}

/* ------------------------------ Repositório de Eventos & Alocação em Caixas (#1 a #4) ------------------------------ */

export function loadEventLibrary(): EventConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EVENTS_LIBRARY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Erro ao ler repositório de eventos:', e);
  }
  localStorage.setItem(STORAGE_KEYS.EVENTS_LIBRARY, JSON.stringify(INITIAL_EVENTS));
  return INITIAL_EVENTS;
}

export function saveEventLibrary(events: EventConfig[], author: string = 'SISTEMA'): void {
  localStorage.setItem(STORAGE_KEYS.EVENTS_LIBRARY, JSON.stringify(events));

  // Sync to Supabase in background
  const client = getSupabaseClient();
  if (client) {
    void client
      .from('app_state')
      .upsert({
        key: 'events_library',
        value: events,
        updated_at: new Date().toISOString(),
      })
      .then(
        ({ error }: any) => {
          if (error) console.warn('Supabase sync (events_library):', error.message);
        },
        (e: any) => console.warn('Supabase sync failed (events_library):', e)
      );
  }
}

export function loadCaixaSlots(): CaixaSlot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CAIXA_SLOTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 4) return parsed;
    }
  } catch (e) {
    console.error('Erro ao ler caixas de eventos:', e);
  }
  localStorage.setItem(STORAGE_KEYS.CAIXA_SLOTS, JSON.stringify(DEFAULT_SLOTS));
  return DEFAULT_SLOTS;
}

export function saveCaixaSlots(slots: CaixaSlot[]): void {
  localStorage.setItem(STORAGE_KEYS.CAIXA_SLOTS, JSON.stringify(slots));

  // Sync to Supabase in background
  const client = getSupabaseClient();
  if (client) {
    void client
      .from('app_state')
      .upsert({
        key: 'caixa_slots',
        value: slots,
        updated_at: new Date().toISOString(),
      })
      .then(
        ({ error }: any) => {
          if (error) console.warn('Supabase sync (caixa_slots):', error.message);
        },
        (e: any) => console.warn('Supabase sync failed (caixa_slots):', e)
      );
  }
}

/**
 * Retorna os eventos atualmente alocados nas Caixas #1, #2, #3, #4.
 * Se o evento já passou há mais de 7 dias, é automaticamente removido da caixa.
 */
export function loadEvents(): EventConfig[] {
  const library = loadEventLibrary();
  const slots = loadCaixaSlots();
  let slotsUpdated = false;

  const allocatedEvents: EventConfig[] = [];
  slots.forEach((slot, idx) => {
    if (slot.eventId) {
      const found = library.find((e) => e.id === slot.eventId);
      if (found) {
        // Se passou mais de 7 dias, remove da caixa automaticamente
        const countdown = formatEventCountdown(found.date);
        if (countdown.isExpiredOver7Days) {
          slots[idx] = { ...slot, eventId: null };
          slotsUpdated = true;
          return;
        }

        allocatedEvents.push({
          ...found,
          slug: slot.slug,
        });
      }
    }
  });

  if (slotsUpdated) {
    saveCaixaSlots(slots);
  }

  // Se nada foi alocado, fallback para o primeiro evento da biblioteca
  if (allocatedEvents.length === 0 && library.length > 0) {
    allocatedEvents.push({ ...library[0], slug: 'eve1' });
  }

  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(allocatedEvents));
  return allocatedEvents;
}

export function saveEvents(events: EventConfig[], author: string = 'SISTEMA'): void {
  const limited = events.slice(0, 4);
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(limited));

  // Também atualiza o repositório de eventos
  const library = loadEventLibrary();
  const updatedLibrary = library.map((libEvt) => {
    const matching = limited.find((e) => e.id === libEvt.id);
    return matching || libEvt;
  });
  saveEventLibrary(updatedLibrary, author);

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

export function allocateEventToSlot(
  slotNumber: number,
  eventId: string | null,
  author: string = 'MAÎTRE'
): { slots: CaixaSlot[]; events: EventConfig[] } {
  const slots = loadCaixaSlots();
  const targetIndex = slotNumber - 1;
  if (targetIndex >= 0 && targetIndex < slots.length) {
    slots[targetIndex] = {
      ...slots[targetIndex],
      eventId,
    };
  }

  saveCaixaSlots(slots);
  const updatedEvents = loadEvents();
  saveEvents(updatedEvents, author);

  const library = loadEventLibrary();
  const evtName = eventId ? library.find((e) => e.id === eventId)?.title || eventId : 'Vazia';
  addAuditLog(author, 'ALOCAÇÃO_CAIXA', `Caixa #${slotNumber} (eve${slotNumber}) alocada com: "${evtName}".`);

  return { slots, events: updatedEvents };
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

function formatTimestampShort(): string {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${dateStr} às ${timeStr}`;
}

function buildOrderTx(actor: string, action: string, details: string): OrderTransactionEntry {
  return {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: formatTimestampShort(),
    actor: actor.trim().toUpperCase() || 'SISTEMA',
    action,
    details,
  };
}

export function resolveOrderStatus(order: GuestOrder): OrderStatus {
  if (order.status) return order.status;
  if (order.delivered) return 'entregue';
  if (order.tableNumber || order.activatedAt) return 'em_producao';
  return 'aguardando';
}

function syncOrderUpsert(order: GuestOrder, contextLabel: string, includeCreatedAt = false): void {
  const client = getSupabaseClient();
  if (!client) return;
  const payload: Record<string, any> = {
    id: order.id,
    data: order,
  };
  if (includeCreatedAt) {
    payload.created_at = new Date().toISOString();
  }
  void client
    .from('orders')
    .upsert(payload)
    .then(
      ({ error }: any) => {
        if (error) console.warn(`Supabase sync (${contextLabel}):`, error.message);
      },
      (e: any) => console.warn(`Supabase sync failed (${contextLabel}):`, e)
    );
}

export function insertOrder(order: GuestOrder): void {
  const normalizedOrder: GuestOrder = {
    ...order,
    status: order.status || 'aguardando',
    transactions: order.transactions && order.transactions.length > 0
      ? order.transactions
      : [
          buildOrderTx(
            'CONVIDADO',
            'EMISSÃO_COMANDA',
            `Comanda ${order.code} emitida por "${order.guestName}" (${order.mainDish.name}${order.dessert ? ` + ${order.dessert.name}` : ''}).`
          ),
        ],
  };

  const current = loadOrders();
  const updated = [normalizedOrder, ...current];
  saveOrders(updated);
  syncOrderUpsert(normalizedOrder, 'insertOrder', true);
}

export function deleteOrder(orderId: string, author: string): boolean {
  const current = loadOrders();
  const target = current.find((o) => o.id === orderId);
  if (!target) return false;

  const updated = current.filter((o) => o.id !== orderId);
  saveOrders(updated);

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

export interface WaiterOrderUpdatePayload {
  guestName?: string;
  mainDish?: MenuItem;
  dessert?: MenuItem | null; // null explicitly removes dessert
  notes?: string;
  tableNumber?: string;
  assignedWaiter?: string;
  activate?: boolean;
}

export function activateAndUpdateOrder(
  orderId: string,
  updates: WaiterOrderUpdatePayload,
  actor: string
): GuestOrder | null {
  const current = loadOrders();
  const target = current.find((o) => o.id === orderId);
  if (!target) return null;

  const cleanActor = actor.trim().toUpperCase() || 'GARÇOM';
  const currentStatus = resolveOrderStatus(target);
  const nowLabel = formatTimestampShort();

  const nextGuestName =
    updates.guestName !== undefined && updates.guestName.trim()
      ? updates.guestName.trim()
      : target.guestName;
  const nextMainDish = updates.mainDish || target.mainDish;
  const nextDessert =
    updates.dessert === null
      ? undefined
      : updates.dessert !== undefined
      ? updates.dessert
      : target.dessert;
  const nextNotes =
    updates.notes !== undefined
      ? updates.notes.trim() || undefined
      : target.notes;
  const nextTable =
    updates.tableNumber !== undefined
      ? updates.tableNumber.trim() || undefined
      : target.tableNumber;
  const nextWaiter =
    updates.assignedWaiter !== undefined
      ? updates.assignedWaiter.trim().toUpperCase() || cleanActor
      : target.assignedWaiter || (updates.activate ? cleanActor : undefined);

  // Build exact change diff for auditability
  const diffs: string[] = [];
  if (nextGuestName !== target.guestName) {
    diffs.push(`Convidado: "${target.guestName}" → "${nextGuestName}"`);
  }
  if ((nextTable || '') !== (target.tableNumber || '')) {
    diffs.push(`Mesa: "${target.tableNumber || 'Sem mesa'}" → "${nextTable || 'Sem mesa'}"`);
  }
  if (nextMainDish.name !== target.mainDish.name) {
    diffs.push(`Prato: "${target.mainDish.name}" → "${nextMainDish.name}"`);
  }
  if ((nextDessert?.name || 'Nenhuma') !== (target.dessert?.name || 'Nenhuma')) {
    diffs.push(`Sobremesa: "${target.dessert?.name || 'Nenhuma'}" → "${nextDessert?.name || 'Nenhuma'}"`);
  }
  if ((nextNotes || '') !== (target.notes || '')) {
    diffs.push(`Obs: "${target.notes || '—'}" → "${nextNotes || '—'}"`);
  }
  if ((nextWaiter || '') !== (target.assignedWaiter || '')) {
    diffs.push(`Garçom: "${target.assignedWaiter || '—'}" → "${nextWaiter || '—'}"`);
  }

  const shouldActivate = !!updates.activate && currentStatus === 'aguardando';
  const nextStatus: OrderStatus = shouldActivate ? 'em_producao' : currentStatus;

  const newTransactions: OrderTransactionEntry[] = [...(target.transactions || [])];

  if (diffs.length > 0) {
    const editSummary = `Alterações em ${target.code} (${nextGuestName}): ${diffs.join(' | ')}.`;
    newTransactions.unshift(buildOrderTx(cleanActor, 'EDIÇÃO_PEDIDO', editSummary));
    addAuditLog(cleanActor, 'EDIÇÃO_PEDIDO', editSummary);
  }

  if (shouldActivate) {
    const activationSummary = `Pedido ${target.code} de "${nextGuestName}" ATIVADO na cozinha para ${
      nextTable ? `Mesa ${nextTable.replace(/^mesa\s*/i, '')}` : 'salão'
    } (Prato: ${nextMainDish.name}) por ${cleanActor}.`;
    newTransactions.unshift(buildOrderTx(cleanActor, 'ATIVAÇÃO_PEDIDO', activationSummary));
    addAuditLog(cleanActor, 'ATIVAÇÃO_PEDIDO', activationSummary);
  }

  const updatedOrder: GuestOrder = {
    ...target,
    guestName: nextGuestName,
    mainDish: nextMainDish,
    dessert: nextDessert,
    notes: nextNotes,
    tableNumber: nextTable,
    assignedWaiter: nextWaiter,
    status: nextStatus,
    activatedAt: shouldActivate ? nowLabel : target.activatedAt,
    activatedBy: shouldActivate ? cleanActor : target.activatedBy,
    lastEditedAt: diffs.length > 0 ? nowLabel : target.lastEditedAt,
    lastEditedBy: diffs.length > 0 ? cleanActor : target.lastEditedBy,
    transactions: newTransactions.slice(0, 40),
  };

  const updated = current.map((o) => (o.id === orderId ? updatedOrder : o));
  saveOrders(updated);
  syncOrderUpsert(updatedOrder, 'activateAndUpdateOrder');
  return updatedOrder;
}

export function markOrderDelivered(
  orderId: string,
  waiterName: string,
  tableNumberOverride?: string
): GuestOrder | null {
  const current = loadOrders();
  const target = current.find((o) => o.id === orderId);
  if (!target) return null;

  const cleanWaiter = waiterName.trim().toUpperCase() || 'GARÇOM';
  const nowLabel = formatTimestampShort();
  const finalTable =
    tableNumberOverride !== undefined && tableNumberOverride.trim()
      ? tableNumberOverride.trim()
      : target.tableNumber;

  const mesaLabel = finalTable ? `Mesa ${finalTable.replace(/^mesa\s*/i, '')}` : 'mesa não informada';
  const details = `Comanda ${target.code} de "${target.guestName}" (${target.mainDish.name}) marcada como ENTREGUE na ${mesaLabel} por ${cleanWaiter}.`;

  const updatedOrder: GuestOrder = {
    ...target,
    status: 'entregue',
    tableNumber: finalTable,
    assignedWaiter: target.assignedWaiter || cleanWaiter,
    activatedAt: target.activatedAt || nowLabel,
    activatedBy: target.activatedBy || cleanWaiter,
    delivered: true,
    deliveredAt: nowLabel,
    deliveredBy: cleanWaiter,
    transactions: [
      buildOrderTx(cleanWaiter, 'ENTREGA_COMANDA', details),
      ...(target.transactions || []),
    ].slice(0, 40),
  };

  const updated = current.map((o) => (o.id === orderId ? updatedOrder : o));
  saveOrders(updated);
  syncOrderUpsert(updatedOrder, 'markOrderDelivered');

  addAuditLog(cleanWaiter, 'ENTREGA_COMANDA', details);
  return updatedOrder;
}

export function unmarkOrderDelivered(orderId: string, staffName: string): GuestOrder | null {
  const current = loadOrders();
  const target = current.find((o) => o.id === orderId);
  if (!target) return null;

  const cleanActor = staffName.trim().toUpperCase() || 'STAFF';
  const revertedStatus: OrderStatus =
    target.tableNumber || target.activatedAt ? 'em_producao' : 'aguardando';
  const details = `Baixa de entrega estornada na comanda ${target.code} de "${target.guestName}" (retornou para ${
    revertedStatus === 'em_producao' ? 'Em Produção' : 'Aguardando Mesa'
  }).`;

  const updatedOrder: GuestOrder = {
    ...target,
    status: revertedStatus,
    delivered: false,
    deliveredAt: undefined,
    deliveredBy: undefined,
    transactions: [
      buildOrderTx(cleanActor, 'ESTORNO_ENTREGA', details),
      ...(target.transactions || []),
    ].slice(0, 40),
  };

  const updated = current.map((o) => (o.id === orderId ? updatedOrder : o));
  saveOrders(updated);
  syncOrderUpsert(updatedOrder, 'unmarkOrderDelivered');

  addAuditLog(cleanActor, 'ESTORNO_ENTREGA', details);
  return updatedOrder;
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

  const updated = [newLog, ...current].slice(0, 500);
  localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(updated));

  // Sync audit logs to Supabase
  const client = getSupabaseClient();
  if (client) {
    void client
      .from('app_state')
      .upsert({
        key: 'audit_logs',
        value: updated,
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
      const libraryRow = stateData.find((r) => r.key === 'events_library');
      if (libraryRow && Array.isArray(libraryRow.value) && libraryRow.value.length > 0) {
        localStorage.setItem(STORAGE_KEYS.EVENTS_LIBRARY, JSON.stringify(libraryRow.value));
      }

      const slotsRow = stateData.find((r) => r.key === 'caixa_slots');
      if (slotsRow && Array.isArray(slotsRow.value) && slotsRow.value.length === 4) {
        localStorage.setItem(STORAGE_KEYS.CAIXA_SLOTS, JSON.stringify(slotsRow.value));
      }

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

export async function exportAllToSupabase(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const library = loadEventLibrary();
    const slots = loadCaixaSlots();
    const events = loadEvents();
    const master = loadMasterDatabase();
    const logs = loadAuditLogs();

    const now = new Date().toISOString();
    await client.from('app_state').upsert([
      { key: 'events_library', value: library, updated_at: now },
      { key: 'caixa_slots', value: slots, updated_at: now },
      { key: 'events', value: events, updated_at: now },
      { key: 'event_config', value: events[0] || null, updated_at: now },
      { key: 'master_database', value: master, updated_at: now },
      { key: 'audit_logs', value: logs, updated_at: now },
    ]);
    return true;
  } catch (e) {
    console.error('Erro ao exportar dados para Supabase:', e);
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

/* ------------------------------ Tradução com Google Translate & Gemini IA ------------------------------ */

export async function translateTextWithAI(
  text: string,
  targetLang: 'en' | 'pt' = 'en',
  context: 'dish' | 'event_description' = 'dish',
  engine: 'gemini' | 'google' = 'gemini'
): Promise<string> {
  if (!text || !text.trim()) return '';

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim(), targetLang, context, engine }),
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

/* ----------------------- Inteligência & Histórico de Negócios ----------------------- */

export function loadEventAnalyticsRecords(): EventAnalyticsRecord[] {
  try {
    const raw = localStorage.getItem('garcon_event_analytics');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Erro ao ler analytics:', e);
  }
  return [];
}

export function saveEventAnalyticsRecord(record: EventAnalyticsRecord): void {
  const current = loadEventAnalyticsRecords();
  const filtered = current.filter((r) => r.id !== record.id);
  const updated = [record, ...filtered].slice(0, 100);
  localStorage.setItem('garcon_event_analytics', JSON.stringify(updated));

  // Sync analytics to Supabase
  const client = getSupabaseClient();
  if (client) {
    void client
      .from('app_state')
      .upsert({
        key: 'event_analytics',
        value: updated,
        updated_at: new Date().toISOString(),
      })
      .then(
        ({ error }: any) => {
          if (error) console.warn('Supabase sync (event_analytics):', error.message);
        },
        (e: any) => console.warn('Supabase sync failed (event_analytics):', e)
      );
  }
}

export function recordEventBusinessSnapshot(
  event: EventConfig,
  orders: GuestOrder[],
  maitreInCharge: StaffUser | string = 'MAÎTRE'
): EventAnalyticsRecord {
  const eventOrders = orders.filter((o) => o.eventId === event.id || o.eventTitle === event.title);

  const dishCounts: Record<string, number> = {};
  const dessertCounts: Record<string, number> = {};
  let notesCount = 0;

  eventOrders.forEach((order) => {
    const main = order.mainDish.name;
    dishCounts[main] = (dishCounts[main] || 0) + 1;

    if (order.dessert) {
      const dName = order.dessert.name;
      dessertCounts[dName] = (dessertCounts[dName] || 0) + 1;
    }

    if (order.notes && order.notes.trim()) {
      notesCount += 1;
    }
  });

  const dishesBreakdown = Object.entries(dishCounts).map(([name, count]) => ({ name, count }));
  const dessertsBreakdown = Object.entries(dessertCounts).map(([name, count]) => ({ name, count }));
  const attendanceRate =
    event.totalReservations > 0
      ? Math.round((eventOrders.length / event.totalReservations) * 100)
      : 100;

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const record: EventAnalyticsRecord = {
    id: `analytics-${event.id}-${Date.now()}`,
    eventId: event.id,
    eventTitle: event.title,
    eventDate: event.date,
    location: event.location,
    coordinatorName: event.coordinatorName,
    coordinatorPhone: event.coordinatorPhone,
    maitreInCharge,
    totalReservations: event.totalReservations,
    totalComandasIssued: eventOrders.length,
    attendanceRate,
    dishesBreakdown,
    dessertsBreakdown,
    specialNotesCount: notesCount,
    recordedAt: `${dateStr} às ${timeStr}`,
  };

  saveEventAnalyticsRecord(record);
  return record;
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
