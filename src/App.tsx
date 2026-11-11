/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { ActiveTab, EventConfig, GuestOrder, MenuItem } from './types';
import {
  MASTER_MENU_DATABASE,
  INITIAL_EVENT_CONFIG,
  HOTEL_INFO,
} from './data/menuDatabase';
import { Navbar } from './components/Navbar';
import { ComandaGuestView } from './components/ComandaGuestView';
import { AdminKitchenView } from './components/AdminKitchenView';
import { EventConfigView } from './components/EventConfigView';
import { MasterDatabaseView } from './components/MasterDatabaseView';
import { ReceiptModal } from './components/ReceiptModal';
import { MaitreGateModal } from './components/MaitreGateModal';
import { isSupabaseConfigured } from './lib/supabase';
import {
  staffSignIn,
  staffSignOut,
  hasStaffSession,
  fetchPublicEvent,
  submitOrder,
  loadStaffState,
  saveState,
  fetchOrders,
  insertOrder,
} from './lib/api';

type BootState = 'loading' | 'ready' | 'no_event' | 'error' | 'not_configured';

const STAFF_TABS: ActiveTab[] = ['admin', 'event_config', 'database'];
const isStaffTab = (t: string): t is ActiveTab => STAFF_TABS.includes(t as ActiveTab);

export default function App() {
  // Navigation: defaults to isolated guest comanda
  const [activeTab, setActiveTab] = useState<ActiveTab>('comanda');
  const [bootState, setBootState] = useState<BootState>('loading');

  // Staff (Maître) access: true only after the password was accepted by Supabase
  const [staffUnlocked, setStaffUnlocked] = useState(false);
  // Tab the Maître wants to open; while not null the password modal is shown
  const [gateTarget, setGateTarget] = useState<ActiveTab | null>(null);

  // Master Database (Permanent canonical catalog) — only loaded for staff
  const [masterDatabase, setMasterDatabase] = useState<MenuItem[]>([]);

  // Active Event Configuration. Guests receive it WITHOUT the access code.
  const [eventConfig, setEventConfig] = useState<EventConfig | null>(null);

  // Orders list — only loaded for staff
  const [orders, setOrders] = useState<GuestOrder[]>([]);

  // Modal order view
  const [modalOrder, setModalOrder] = useState<GuestOrder | null>(null);

  const [syncError, setSyncError] = useState('');

  const reportSyncError = useCallback(() => {
    setSyncError('Não foi possível salvar no servidor. Verifique a conexão e tente de novo.');
    setTimeout(() => setSyncError(''), 6000);
  }, []);

  // Loads everything staff needs (seeds defaults on the very first access)
  const enterStaff = useCallback(async (tab: ActiveTab) => {
    const state = await loadStaffState();
    const master = state.masterDatabase ?? MASTER_MENU_DATABASE;
    const config = state.eventConfig ?? INITIAL_EVENT_CONFIG;
    if (!state.masterDatabase) await saveState('master_database', master);
    if (!state.eventConfig) await saveState('event_config', config);
    const currentOrders = await fetchOrders();

    setMasterDatabase(master);
    setEventConfig(config);
    setOrders(currentOrders);
    setStaffUnlocked(true);
    setBootState('ready');
    setActiveTab(tab);
    window.location.hash = tab;
  }, []);

  // Leaves the Maître side: signs out and wipes staff data from memory
  const lockStaff = useCallback(() => {
    void staffSignOut();
    setStaffUnlocked(false);
    setOrders([]);
    setMasterDatabase([]);
    setModalOrder(null);
    setEventConfig((prev) => (prev ? { ...prev, accessCode: '' } : prev));
  }, []);

  // Boot: guests get the public event; a reload inside the staff area keeps
  // the session for the current tab only (sessionStorage).
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!isSupabaseConfigured) {
        setBootState('not_configured');
        return;
      }

      const hash = window.location.hash.replace('#', '');
      const wantsStaff = isStaffTab(hash);

      try {
        const session = await hasStaffSession();

        if (session && wantsStaff) {
          await enterStaff(hash as ActiveTab);
          return;
        }
        if (session) await staffSignOut();

        const publicEvent = await fetchPublicEvent();
        if (cancelled) return;
        setEventConfig(publicEvent);
        setBootState(publicEvent ? 'ready' : 'no_event');
        if (wantsStaff) setGateTarget(hash as ActiveTab);
      } catch {
        if (!cancelled) setBootState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enterStaff]);

  // Near-real-time kitchen map: refresh orders every few seconds
  useEffect(() => {
    if (!staffUnlocked || activeTab !== 'admin') return;
    const timer = setInterval(() => {
      fetchOrders()
        .then(setOrders)
        .catch(() => {
          /* tenta de novo no próximo ciclo */
        });
    }, 8000);
    return () => clearInterval(timer);
  }, [staffUnlocked, activeTab]);

  const handleSwitchTab = (tab: ActiveTab) => {
    if (tab === 'comanda') {
      // Going back to the guest side locks the Maître area again
      if (staffUnlocked) lockStaff();
      setActiveTab('comanda');
      window.location.hash = 'comanda';
      return;
    }

    if (staffUnlocked) {
      setActiveTab(tab);
      window.location.hash = tab;
      return;
    }

    // Not unlocked: ask for the Maître password first
    setGateTarget(tab);
  };

  const handleGateSubmit = async (password: string): Promise<string | null> => {
    if (!gateTarget) return null;

    const result = await staffSignIn(password);
    if (!result.ok) {
      switch (result.error) {
        case 'bad_password':
          return 'Senha incorreta.';
        case 'rate_limited':
          return 'Muitas tentativas. Aguarde um minuto e tente de novo.';
        case 'not_configured':
          return 'Acesso da equipe não configurado (faltam as variáveis do Supabase).';
        default:
          return 'Não foi possível verificar a senha. Confira a conexão.';
      }
    }

    try {
      await enterStaff(gateTarget);
      setGateTarget(null);
      return null;
    } catch {
      await staffSignOut();
      return 'Senha correta, mas não foi possível carregar os dados. Tente de novo.';
    }
  };

  const handleGateClose = () => {
    setGateTarget(null);
    if (window.location.hash.replace('#', '') !== 'comanda') {
      window.location.hash = 'comanda';
    }
  };

  const handleSubmitGuestOrder = (order: GuestOrder, code: string) =>
    submitOrder(order, code);

  const handleAddSimulatedOrder = (simulatedOrder: GuestOrder) => {
    setOrders((prev) => [simulatedOrder, ...prev]);
    insertOrder(simulatedOrder).catch(reportSyncError);
  };

  const handleUpdateEventConfig = (newConfig: EventConfig) => {
    setEventConfig(newConfig);
    saveState('event_config', newConfig).catch(reportSyncError);
  };

  const handleUpdateMasterDatabase = (updated: MenuItem[]) => {
    setMasterDatabase(updated);
    saveState('master_database', updated).catch(reportSyncError);
  };

  const handleResetToDefault = () => {
    if (!eventConfig) return;
    if (window.confirm('Restaurar as opções do evento com as receitas do Acervo Mestre?')) {
      const resetConfig: EventConfig = {
        ...INITIAL_EVENT_CONFIG,
        activeDishes: masterDatabase.filter((m) => m.category === 'main').slice(0, 4),
        activeDesserts: masterDatabase.filter((m) => m.category === 'dessert').slice(0, 3),
      };
      handleUpdateEventConfig(resetConfig);
    }
  };

  const isGuestMode = activeTab === 'comanda';

  // Shown to guests while the event is loading or unavailable
  const guestPlaceholder = (message: string) => (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="text-lg font-bold tracking-widest text-[#d3a809] uppercase font-display">
        Garç<span className="text-white">ON</span>
      </span>
      <p className="text-sm text-neutral-300 max-w-sm">{message}</p>
      {bootState !== 'loading' && bootState !== 'not_configured' && (
        <button
          onClick={() => handleSwitchTab('admin')}
          className="text-[11px] text-neutral-400 hover:text-[#d3a809] flex items-center gap-1.5 transition-colors px-2 py-1 rounded hover:bg-white/[0.05] cursor-pointer"
          title="Acesso da Equipe do Hotel"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Maître</span>
        </button>
      )}
    </div>
  );

  const renderGuest = () => {
    if (bootState === 'loading') return guestPlaceholder('Carregando…');
    if (bootState === 'not_configured') {
      return guestPlaceholder(
        'Configuração pendente: defina as variáveis do Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY e VITE_STAFF_EMAIL).'
      );
    }
    if (bootState === 'error') {
      return guestPlaceholder('Não foi possível carregar o evento. Verifique a conexão e recarregue a página.');
    }
    if (!eventConfig) {
      return guestPlaceholder('Nenhum evento disponível no momento.');
    }
    return (
      <ComandaGuestView
        eventConfig={eventConfig}
        onSubmitOrder={handleSubmitGuestOrder}
        onOpenAdmin={() => handleSwitchTab('admin')}
      />
    );
  };

  return (
    <div className="min-h-screen bg-[#00001f] text-neutral-100 flex flex-col relative selection:bg-[#d3a809] selection:text-neutral-950 font-sans">
      {/* Background ambient luxury lighting with exact hotel midnight navy */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(211,168,9,0.12),rgba(0,0,31,0)_80%)]" />

      {/* TOP HEADER: ONLY SHOWN FOR STAFF / ADMIN PAGES (COMPLETELY REMOVED FOR GUEST COMANDA) */}
      {!isGuestMode && staffUnlocked && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={handleSwitchTab}
          ordersCount={orders.length}
          onOpenGuestComanda={() => handleSwitchTab('comanda')}
        />
      )}

      {/* MAIN VIEW */}
      <main className="relative z-10 flex-1">
        {isGuestMode ? (
          // ISOLATED GUEST ENVIRONMENT (NO HEADER, REDUCED FOOTER, MINIMAL GLASSMORPHIC)
          renderGuest()
        ) : (
          // STAFF / LOGISTICS ENVIRONMENT (only after the Maître password)
          staffUnlocked &&
          eventConfig && (
            <>
              {activeTab === 'admin' && (
                <AdminKitchenView
                  orders={orders}
                  eventConfig={eventConfig}
                  onAddSimulatedOrder={handleAddSimulatedOrder}
                  onViewReceipt={(order) => setModalOrder(order)}
                  onOpenGuestComanda={() => handleSwitchTab('comanda')}
                />
              )}

              {activeTab === 'event_config' && (
                <EventConfigView
                  eventConfig={eventConfig}
                  onUpdateEventConfig={handleUpdateEventConfig}
                  masterDatabase={masterDatabase}
                  onResetToDefault={handleResetToDefault}
                  onOpenGuestComanda={() => handleSwitchTab('comanda')}
                />
              )}

              {activeTab === 'database' && (
                <MasterDatabaseView
                  masterDatabase={masterDatabase}
                  onUpdateMasterDatabase={handleUpdateMasterDatabase}
                  onOpenGuestComanda={() => handleSwitchTab('comanda')}
                />
              )}
            </>
          )
        )}
      </main>

      {/* MODAL RECEIPT (FOR STAFF INSPECTION) */}
      {staffUnlocked && eventConfig && (
        <ReceiptModal
          order={modalOrder}
          eventConfig={eventConfig}
          onClose={() => setModalOrder(null)}
        />
      )}

      {/* MAÎTRE PASSWORD */}
      <MaitreGateModal
        open={gateTarget !== null}
        onClose={handleGateClose}
        onSubmit={handleGateSubmit}
      />

      {/* SAVE ERROR TOAST */}
      {syncError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] max-w-sm w-[90%] text-xs text-rose-200 bg-rose-950/90 border border-rose-500/30 rounded-xl px-4 py-3 shadow-lg no-print">
          {syncError}
        </div>
      )}

      {/* FOOTER: ONLY SHOWN ON ADMIN VIEWS (GUEST HAS ITS OWN MINIMAL FOOTER) */}
      {!isGuestMode && staffUnlocked && (
        <footer className="relative z-10 border-t border-white/[0.08] bg-[#00001f] py-5 px-6 text-xs text-neutral-400 no-print">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-wider text-[#d3a809] text-sm font-display">
                {HOTEL_INFO.name}
              </span>
              <span className="text-neutral-600">·</span>
              <span>GarçON Gestão Gastronômica</span>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-neutral-400">
              <span>{HOTEL_INFO.address}</span>
              <span className="text-neutral-600 hidden md:inline">·</span>
              <span className="hidden md:inline">CNPJ: {HOTEL_INFO.cnpj}</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
