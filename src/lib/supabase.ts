import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Prioritize environment variables, then localStorage configured credentials
const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function getStoredUrl(): string | undefined {
  try {
    return envUrl || localStorage.getItem('garcon_supabase_url') || undefined;
  } catch {
    return envUrl;
  }
}

function getStoredKey(): string | undefined {
  try {
    return envAnonKey || localStorage.getItem('garcon_supabase_anon_key') || undefined;
  } catch {
    return envAnonKey;
  }
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = getStoredUrl();
  const anonKey = getStoredKey();

  if (!url || !anonKey) return null;

  if (cachedClient) return cachedClient;

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        storage: window.sessionStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
    return cachedClient;
  } catch (err) {
    console.error('Falha ao inicializar Supabase:', err);
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getStoredUrl() && getStoredKey());
}

export function updateSupabaseConfig(url: string, anonKey: string): void {
  try {
    localStorage.setItem('garcon_supabase_url', url.trim());
    localStorage.setItem('garcon_supabase_anon_key', anonKey.trim());
    cachedClient = null; // Re-create client
  } catch (e) {
    console.error('Erro ao salvar credenciais Supabase:', e);
  }
}

// Export default instance for quick access
export const supabase = getSupabaseClient();
