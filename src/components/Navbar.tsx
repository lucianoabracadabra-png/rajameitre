import React from 'react';
import { ActiveTab, StaffUser } from '../types';
import { ExternalLink, History, LogOut, UserCheck } from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  ordersCount: number;
  currentUser: StaffUser | null;
  onSignOut: () => void;
  onOpenGuestComanda: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  ordersCount,
  currentUser,
  onSignOut,
  onOpenGuestComanda,
}) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#00001f]/95 backdrop-blur-md no-print">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 sm:gap-6 px-4 sm:px-6 py-3">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-widest text-[#d3a809] uppercase font-display whitespace-nowrap shrink-0">
            Garç<span className="text-white">ON</span>
            <span className="text-xs font-sans font-light tracking-widest text-neutral-400 ml-2.5 hidden sm:inline">
              · BH RAJA HOTEL
            </span>
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="flex items-center gap-4 sm:gap-7 text-xs sm:text-sm tracking-wide font-medium overflow-x-auto py-1">
          <button
            onClick={() => setActiveTab('admin')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 relative flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'admin'
                ? 'text-[#d3a809] font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Mapa de Produção
            {ordersCount > 0 && (
              <span className="text-[10px] bg-[#d3a809]/20 text-[#d3a809] border border-[#d3a809]/30 px-1.5 py-0.2 rounded font-mono font-bold">
                {ordersCount}
              </span>
            )}
            {activeTab === 'admin' && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#d3a809] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('event_config')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 relative cursor-pointer ${
              activeTab === 'event_config'
                ? 'text-[#d3a809] font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Configurar Eventos
            {activeTab === 'event_config' && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#d3a809] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 relative cursor-pointer ${
              activeTab === 'database'
                ? 'text-[#d3a809] font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Acervo Mestre (DB)
            {activeTab === 'database' && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#d3a809] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('audit_log')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 relative flex items-center gap-1 cursor-pointer ${
              activeTab === 'audit_log'
                ? 'text-[#d3a809] font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Histórico
            {activeTab === 'audit_log' && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#d3a809] rounded-full" />
            )}
          </button>
        </nav>

        {/* Zone 3: Logged User Badge & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {currentUser && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-neutral-300">
              <UserCheck className="w-3 h-3 text-[#d3a809]" />
              <span>{currentUser}</span>
              <button
                onClick={onSignOut}
                className="ml-1 text-neutral-500 hover:text-rose-400 p-0.5 cursor-pointer"
                title="Sair do Maître"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          )}

          <button
            onClick={onOpenGuestComanda}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold tracking-wider uppercase text-neutral-950 bg-gradient-to-r from-[#d3a809] to-[#b38b00] hover:from-[#e3b819] hover:to-[#c49800] rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Comanda Convidado</span>
            <span className="sm:hidden">Comanda</span>
          </button>
        </div>
      </div>
    </header>
  );
};
