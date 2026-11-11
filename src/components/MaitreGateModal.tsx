import React, { useEffect, useRef, useState } from 'react';
import { Lock, AlertCircle } from 'lucide-react';

interface MaitreGateModalProps {
  open: boolean;
  onClose: () => void;
  // Devolve null se a senha estiver certa, ou a mensagem de erro para exibir.
  onSubmit: (password: string) => Promise<string | null>;
}

export const MaitreGateModal: React.FC<MaitreGateModalProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPassword('');
      setError('');
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !password) return;
    setLoading(true);
    setError('');
    const result = await onSubmit(password);
    if (result) {
      setError(result);
      setPassword('');
      setLoading(false);
      inputRef.current?.focus();
    }
    // Se deu certo, o App fecha o modal.
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer no-print"
      role="dialog"
      aria-modal="true"
      aria-label="Acesso do Maître"
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="glass-panel w-full max-w-sm rounded-2xl p-6 space-y-4 cursor-default"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#d3a809]/10 border border-[#d3a809]/30 flex items-center justify-center">
            <Lock className="w-4 h-4 text-[#d3a809]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white font-display tracking-tight">
              Acesso do Maître
            </h2>
            <p className="text-[11px] text-neutral-400">
              Digite a senha da equipe para continuar.
            </p>
          </div>
        </div>

        <input
          ref={inputRef}
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          autoComplete="current-password"
          placeholder="Senha"
          className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.1] focus:border-[#d3a809] rounded-xl text-sm text-white placeholder-neutral-500 outline-none transition-all font-mono tracking-wider"
        />

        {error && (
          <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-neutral-300 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !password}
            className="px-4 py-2 text-xs font-bold tracking-wider uppercase text-neutral-950 bg-gradient-to-r from-[#d3a809] to-[#b38b00] hover:from-[#e3b819] hover:to-[#c49800] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Verificando…' : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  );
};
