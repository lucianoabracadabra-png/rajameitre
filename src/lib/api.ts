import type { EventConfig, GuestOrder, MenuItem } from '../types';
import { supabase, STAFF_EMAIL } from './supabase';

function db() {
  if (!supabase) throw new Error('Supabase não configurado');
  return supabase;
}

/* ------------------------------ Maître ------------------------------ */

export type StaffSignInResult =
  | { ok: true }
  | { ok: false; error: 'bad_password' | 'rate_limited' | 'not_configured' | 'network' };

export async function staffSignIn(password: string): Promise<StaffSignInResult> {
  if (!supabase || !STAFF_EMAIL) return { ok: false, error: 'not_configured' };
  const { error } = await supabase.auth.signInWithPassword({
    email: STAFF_EMAIL,
    password,
  });
  if (!error) return { ok: true };
  if (error.status === 429) return { ok: false, error: 'rate_limited' };
  if (error.status === 400 || error.code === 'invalid_credentials') {
    return { ok: false, error: 'bad_password' };
  }
  return { ok: false, error: 'network' };
}

export async function staffSignOut(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch {
    // sem rede: a sessão expira ao fechar a aba de qualquer forma
  }
}

export async function hasStaffSession(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

/* ----------------------------- Convidado ---------------------------- */

// Evento ativo SEM a senha (o servidor remove o accessCode).
export async function fetchPublicEvent(): Promise<EventConfig | null> {
  const { data, error } = await db().rpc('get_public_event');
  if (error) throw error;
  if (!data) return null;
  return { ...(data as EventConfig), accessCode: '' };
}

export type SubmitOrderResult =
  | { ok: true }
  | { ok: false; error: 'bad_code' | 'no_event' | 'invalid' | 'network' };

export async function submitOrder(
  order: GuestOrder,
  code: string
): Promise<SubmitOrderResult> {
  const { data, error } = await db().rpc('submit_order', {
    p_order: order,
    p_code: code,
  });
  if (error) return { ok: false, error: 'network' };
  const res = data as { ok: boolean; error?: string } | null;
  if (res?.ok) return { ok: true };
  const known = ['bad_code', 'no_event', 'invalid'] as const;
  const err = known.find((k) => k === res?.error) ?? 'invalid';
  return { ok: false, error: err };
}

/* ------------------------------ Equipe ------------------------------ */

export async function loadStaffState(): Promise<{
  masterDatabase: MenuItem[] | null;
  eventConfig: EventConfig | null;
}> {
  const { data, error } = await db()
    .from('app_state')
    .select('key, value')
    .in('key', ['master_database', 'event_config']);
  if (error) throw error;
  const rows = (data ?? []) as { key: string; value: unknown }[];
  const master = rows.find((r) => r.key === 'master_database')?.value as MenuItem[] | undefined;
  const config = rows.find((r) => r.key === 'event_config')?.value as EventConfig | undefined;
  return { masterDatabase: master ?? null, eventConfig: config ?? null };
}

export async function saveState(
  key: 'master_database' | 'event_config',
  value: MenuItem[] | EventConfig
): Promise<void> {
  const { error } = await db()
    .from('app_state')
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function fetchOrders(): Promise<GuestOrder[]> {
  const { data, error } = await db()
    .from('orders')
    .select('data')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as { data: GuestOrder }[]).map((r) => r.data);
}

export async function insertOrder(order: GuestOrder): Promise<void> {
  const { error } = await db().from('orders').insert({ id: order.id, data: order });
  if (error) throw error;
}
