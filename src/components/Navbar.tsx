import React from 'react';
import { ActiveTab } from '../types';
import { ExternalLink } from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  ordersCount: number;
  onOpenGuestComanda: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  ordersCount,
  onOpenGuestComanda,
}) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#00001f]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 px-6 py-3">
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
        <nav className="flex items-center gap-6 sm:gap-8 text-xs sm:text-sm tracking-wide font-medium">
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
            Configurar Evento
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
        </nav>

        {/* Zone 3: Primary Action to launch Isolated Guest Comanda */}
        <div className="flex items-center shrink-0">
          <button
            onClick={onOpenGuestComanda}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-wider uppercase text-neutral-950 bg-gradient-to-r from-[#d3a809] to-[#b38b00] hover:from-[#e3b819] hover:to-[#c49800] rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Comanda Convidado</span>
          </button>
        </div>
      </div>
    </header>
  );
};
