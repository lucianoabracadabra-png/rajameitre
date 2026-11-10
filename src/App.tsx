/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ActiveTab,
  EventConfig,
  GuestOrder,
  MenuItem,
} from './types';
import {
  MASTER_MENU_DATABASE,
  INITIAL_EVENT_CONFIG,
  INITIAL_ORDERS,
  HOTEL_INFO,
} from './data/menuDatabase';
import { Navbar } from './components/Navbar';
import { ComandaGuestView } from './components/ComandaGuestView';
import { AdminKitchenView } from './components/AdminKitchenView';
import { EventConfigView } from './components/EventConfigView';
import { MasterDatabaseView } from './components/MasterDatabaseView';
import { ReceiptModal } from './components/ReceiptModal';

export default function App() {
  // Navigation: defaults to isolated guest comanda
  const [activeTab, setActiveTab] = useState<ActiveTab>('comanda');

  // Master Database (Permanent canonical catalog)
  const [masterDatabase, setMasterDatabase] = useState<MenuItem[]>(() => {
    try {
      const saved = localStorage.getItem('garcon_master_database');
      return saved ? JSON.parse(saved) : MASTER_MENU_DATABASE;
    } catch {
      return MASTER_MENU_DATABASE;
    }
  });

  // Active Event Configuration (Isolated clone for today's event)
  const [eventConfig, setEventConfig] = useState<EventConfig>(() => {
    try {
      const saved = localStorage.getItem('garcon_event_config');
      return saved ? JSON.parse(saved) : INITIAL_EVENT_CONFIG;
    } catch {
      return INITIAL_EVENT_CONFIG;
    }
  });

  // Orders list
  const [orders, setOrders] = useState<GuestOrder[]>(() => {
    try {
      const saved = localStorage.getItem('garcon_orders');
      return saved ? JSON.parse(saved) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  // Modal order view
  const [modalOrder, setModalOrder] = useState<GuestOrder | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('garcon_master_database', JSON.stringify(masterDatabase));
  }, [masterDatabase]);

  useEffect(() => {
    localStorage.setItem('garcon_event_config', JSON.stringify(eventConfig));
  }, [eventConfig]);

  useEffect(() => {
    localStorage.setItem('garcon_orders', JSON.stringify(orders));
  }, [orders]);

  // Handle URL hash changes
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'admin' || hash === 'event_config' || hash === 'database') {
      setActiveTab(hash as ActiveTab);
    } else if (hash === 'comanda') {
      setActiveTab('comanda');
    }
  }, []);

  const handleSwitchTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  const handleOrderCreated = (newOrder: GuestOrder) => {
    setOrders((prev) => [newOrder, ...prev]);
  };

  const handleAddSimulatedOrder = (simulatedOrder: GuestOrder) => {
    setOrders((prev) => [simulatedOrder, ...prev]);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Restaurar as opções do evento com as receitas do Acervo Mestre?')) {
      const resetConfig: EventConfig = {
        ...INITIAL_EVENT_CONFIG,
        activeDishes: masterDatabase.filter((m) => m.category === 'main').slice(0, 4),
        activeDesserts: masterDatabase.filter((m) => m.category === 'dessert').slice(0, 3),
      };
      setEventConfig(resetConfig);
    }
  };

  const isGuestMode = activeTab === 'comanda';

  return (
    <div className="min-h-screen bg-[#00001f] text-neutral-100 flex flex-col relative selection:bg-[#d3a809] selection:text-neutral-950 font-sans">
      {/* Background ambient luxury lighting with exact hotel midnight navy */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(211,168,9,0.12),rgba(0,0,31,0)_80%)]" />

      {/* TOP HEADER: ONLY SHOWN FOR STAFF / ADMIN PAGES (COMPLETELY REMOVED FOR GUEST COMANDA) */}
      {!isGuestMode && (
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
          <ComandaGuestView
            eventConfig={eventConfig}
            onOrderCreated={handleOrderCreated}
            onOpenAdmin={() => handleSwitchTab('admin')}
          />
        ) : (
          // STAFF / LOGISTICS ENVIRONMENT
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
                onUpdateEventConfig={setEventConfig}
                masterDatabase={masterDatabase}
                onResetToDefault={handleResetToDefault}
                onOpenGuestComanda={() => handleSwitchTab('comanda')}
              />
            )}

            {activeTab === 'database' && (
              <MasterDatabaseView
                masterDatabase={masterDatabase}
                onUpdateMasterDatabase={setMasterDatabase}
                onOpenGuestComanda={() => handleSwitchTab('comanda')}
              />
            )}
          </>
        )}
      </main>

      {/* MODAL RECEIPT (FOR STAFF INSPECTION) */}
      <ReceiptModal
        order={modalOrder}
        eventConfig={eventConfig}
        onClose={() => setModalOrder(null)}
      />

      {/* FOOTER: ONLY SHOWN ON ADMIN VIEWS (GUEST HAS ITS OWN MINIMAL FOOTER) */}
      {!isGuestMode && (
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
