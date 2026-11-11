import React, { useEffect, useRef, useState } from 'react';
import { Lock, AlertCircle, ShieldCheck, UserCheck } from 'lucide-react';
import { StaffUser } from '../types';

interface MaitreGateModalProps {
  open: boolean;
  onClose: () => void;
  // Retorna null se autenticado, ou a mensagem de erro.
  onSubmit: (user: StaffUser, password: string) => Promise<string | null>;
}

const STAFF_USERS: { id: StaffUser; label: string; role: string }[] = [
  { id: 'FSOUZA', label: 'F. Souza', role: 'Maître Executivo' },
  { id: 'LAUGUSTO', label: 'L. Augusto', role: 'Maître de Salão' },
  { id: 'GILSON', label: 'Gilson', role: 'Coordenador de Alimentos' },
];

export const MaitreGateModal: React.FC<MaitreGateModalProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const [selectedUser, setSelectedUser] = useState<StaffUser>('FSOUZA');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPassword('');
      setError('');
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 80);
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

    const err = await onSubmit(selectedUser, password);
    if (err) {
      setError(err);
      setPassword('');
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer no-print"
      role="dialog"
      aria-modal="true"
      aria-label="Acesso do Maître"
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="glass-panel w-full max-w-sm rounded-2xl p-6 space-y-4 border border-[#d3a809]/30 shadow-2xl cursor-default"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#d3a809]/15 border border-[#d3a809]/30 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-[#d3a809]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[10px] text-[#d3a809] font-bold tracking-widest uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              BH Raja Hotel · Staff
            </div>
            <h2 className="text-base font-bold text-white font-display tracking-tight">
              Acesso do Maître
            </h2>
          </div>
        </div>

        {/* User Selection Chips */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-[#d3a809]" />
            Selecione seu Usuário
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {STAFF_USERS.map((user) => {
              const isSelected = selectedUser === user.id;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    setSelectedUser(user.id);
                    setError('');
                    inputRef.current?.focus();
                  }}
                  className={`py-2 px-2 rounded-xl text-center transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#d3a809] text-neutral-950 font-bold border-[#d3a809] shadow-sm'
                      : 'bg-white/[0.04] text-neutral-300 border-white/[0.08] hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  <div className="text-xs font-mono font-bold leading-tight">{user.id}</div>
                  <div className="text-[9px] opacity-80 leading-tight mt-0.5">{user.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider">
            Senha de Acesso
          </label>
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            autoComplete="current-password"
            placeholder="Digite sua senha"
            className="w-full px-3.5 py-2.5 bg-black/50 border border-white/[0.12] focus:border-[#d3a809] rounded-xl text-xs text-white placeholder-neutral-500 outline-none transition-all font-mono tracking-wider"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !password}
            className="px-5 py-2 text-xs font-bold tracking-wider uppercase text-neutral-950 bg-gradient-to-r from-[#d3a809] to-[#b38b00] hover:from-[#e3b819] hover:to-[#c49800] rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md active:scale-95"
          >
            {loading ? 'Validando…' : 'Entrar no Painel'}
          </button>
        </div>
      </form>
    </div>
  );
};
