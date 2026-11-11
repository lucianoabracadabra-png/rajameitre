import React, { useState } from 'react';
import { Database, Check, RefreshCw, UploadCloud, X, AlertCircle } from 'lucide-react';
import { isSupabaseConfigured, updateSupabaseConfig } from '../lib/supabase';
import { syncFromSupabase, exportAllToSupabase } from '../lib/api';

interface SupabaseSyncModalProps {
  open: boolean;
  onClose: () => void;
  onSynced: () => void;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  open,
  onClose,
  onSynced,
}) => {
  const [supabaseUrl, setSupabaseUrl] = useState(
    localStorage.getItem('garcon_supabase_url') ||
      (import.meta.env.VITE_SUPABASE_URL as string) ||
      ''
  );
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(
    localStorage.getItem('garcon_supabase_anon_key') ||
      (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
      ''
  );

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!open) return null;

  const handleSaveCredentials = () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setStatusMessage({ type: 'error', text: 'Informe a URL e a Anon Key do Supabase.' });
      return;
    }

    updateSupabaseConfig(supabaseUrl.trim(), supabaseAnonKey.trim());
    setStatusMessage({ type: 'success', text: 'Credenciais do Supabase salvas com sucesso!' });
  };

  const handleSyncFromSupabase = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const ok = await syncFromSupabase();
      if (ok) {
        setStatusMessage({ type: 'success', text: 'Dados sincronizados do Supabase com sucesso!' });
        onSynced();
      } else {
        setStatusMessage({ type: 'error', text: 'Não foi possível carregar dados do Supabase. Verifique a conexão e as chaves.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportToSupabase = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const ok = await exportAllToSupabase();
      if (ok) {
        setStatusMessage({ type: 'success', text: 'Todos os dados (eventos, caixas e pratos) foram salvos no Supabase!' });
        onSynced();
      } else {
        setStatusMessage({ type: 'error', text: 'Falha ao salvar no Supabase. Verifique as credenciais.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const isConfigured = isSupabaseConfigured();

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel border border-[#d3a809]/30 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#d3a809]" />
            <h3 className="text-base font-bold text-white font-display">
              Gerenciamento Supabase DB
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.08]">
          <span className="text-xs text-neutral-300 font-medium">Status da Conexão:</span>
          {isConfigured ? (
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
              <Check className="w-3 h-3" />
              Conectado ao Supabase
            </span>
          ) : (
            <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Armazenamento Local Ativo
            </span>
          )}
        </div>

        {/* Credentials Form */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider block mb-1">
              VITE_SUPABASE_URL:
            </label>
            <input
              type="text"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="w-full px-3 py-2 bg-black/60 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809] font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider block mb-1">
              VITE_SUPABASE_ANON_KEY:
            </label>
            <input
              type="password"
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              className="w-full px-3 py-2 bg-black/60 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809] font-mono text-xs"
            />
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={handleSaveCredentials}
              className="w-full py-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.12] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Salvar Credenciais
            </button>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Sync Actions */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.08]">
          <button
            type="button"
            disabled={loading}
            onClick={handleSyncFromSupabase}
            className="py-2.5 px-3 bg-black/50 hover:bg-black/70 border border-white/[0.1] text-neutral-200 text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#d3a809] ${loading ? 'animate-spin' : ''}`} />
            <span>Puxar do Supabase</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleExportToSupabase}
            className="py-2.5 px-3 bg-[#d3a809] hover:bg-[#b89100] text-neutral-950 text-xs font-bold uppercase rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Salvar no Supabase</span>
          </button>
        </div>
      </div>
    </div>
  );
};
