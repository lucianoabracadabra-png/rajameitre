import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const STAFF_EMAIL = (import.meta.env.VITE_STAFF_EMAIL as string | undefined) ?? '';

export const isSupabaseConfigured = Boolean(url && anonKey && STAFF_EMAIL);

// A sessão do Maître fica no sessionStorage: some ao fechar a aba
// (importante em tablets/computadores compartilhados do salão).
export const supabase = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        storage: window.sessionStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;
