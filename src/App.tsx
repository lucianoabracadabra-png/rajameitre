/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ActiveTab, EventConfig, GuestOrder, MenuItem, StaffUser, AuditLogEntry } from './types';
import { HOTEL_INFO } from './data/menuDatabase';
import { Navbar } from './components/Navbar';
import { ComandaGuestView } from './components/ComandaGuestView';
import { AdminKitchenView } from './components/AdminKitchenView';
import { EventConfigView } from './components/EventConfigView';
import { MasterDatabaseView } from './components/MasterDatabaseView';
import { AuditLogView } from './components/AuditLogView';
import { ReceiptModal } from './components/ReceiptModal';
import { MaitreGateModal } from './components/MaitreGateModal';
import {
  staffSignIn,
  staffSignOut,
  getStaffSession,
  loadEvents,
  saveEvents,
  getActiveEventId,
  setActiveEventId,
  loadMasterDatabase,
  saveMasterDatabase,
  loadOrders,
  saveOrders,
  insertOrder,
  deleteOrder,
  loadAuditLogs,
  addAuditLog,
  submitOrder,
  syncFromSupabase,
} from './lib/api';
import { isSupabaseConfigured } from './lib/supabase';

const STAFF_TABS: ActiveTab[] = ['admin', 'event_config', 'database', 'audit_log'];
const isStaffTab = (t: string): t is ActiveTab => STAFF_TABS.includes(t as ActiveTab);

export default function App() {
  // Navigation: defaults to isolated guest comanda
  const [activeTab, setActiveTab] = useState<ActiveTab>('comanda');

  // Staff (Maître) access: true only after authentication
  const [staffUnlocked, setStaffUnlocked] = useState(false);
  const [currentStaffUser, setCurrentStaffUser] = useState<StaffUser | null>(null);

  // Modal gate target: while not null the password modal is shown
  const [gateTarget, setGateTarget] = useState<ActiveTab | null>(null);

  // Multi-Event State: Up to 4 simultaneous events
  const [events, setEvents] = useState<EventConfig[]>([]);
  const [currentEventId, setCurrentEventId] = useState<string>('');

  // Master Database (Permanent canonical catalog)
  const [masterDatabase, setMasterDatabase] = useState<MenuItem[]>([]);

  // Orders list (Consolidated for all events)
  const [orders, setOrders] = useState<GuestOrder[]>([]);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Modal order view for receipt inspection
  const [modalOrder, setModalOrder] = useState<GuestOrder | null>(null);

  // Detect direct event link for guests (e.g. ?event=eve1 or #/eve1 or #/evt-raja-1)
  const resolveTargetEvent = (eventList: EventConfig[]): string => {
    // 1. Check query parameter: ?event=eve1 or ?e=eve1
    const urlParams = new URLSearchParams(window.location.search);
    const paramEvt = urlParams.get('event') || urlParams.get('e');
    if (paramEvt) {
      const found = eventList.find(
        (e) => e.id === paramEvt || e.slug === paramEvt || e.id.endsWith(paramEvt)
      );
      if (found) return found.id;
    }

    // 2. Check hash route: #/eve1 or #/event/eve1 or #eve1
    const rawHash = window.location.hash.replace(/^#\/?/, '').replace(/^event\//, '');
    if (rawHash && !isStaffTab(rawHash) && rawHash !== 'comanda') {
      const found = eventList.find(
        (e) => e.id === rawHash || e.slug === rawHash || e.id.endsWith(rawHash)
      );
      if (found) return found.id;
    }

    // 3. Check pathname: /eve1 or /evt-raja-1
    const pathPart = window.location.pathname.replace(/^\//, '').split('/')[0];
    if (pathPart) {
      const found = eventList.find(
        (e) => e.id === pathPart || e.slug === pathPart
      );
      if (found) return found.id;
    }

    // Fallback to stored active event or first event
    const stored = getActiveEventId();
    return eventList.find((e) => e.id === stored)?.id || eventList[0]?.id || 'evt-raja-1';
  };

  // Initialize data on boot
  useEffect(() => {
    const loadedEvents = loadEvents();
    const resolvedEventId = resolveTargetEvent(loadedEvents);
    const loadedMaster = loadMasterDatabase();
    const loadedOrders = loadOrders();
    const loadedLogs = loadAuditLogs();

    setEvents(loadedEvents);
    setCurrentEventId(resolvedEventId);
    setMasterDatabase(loadedMaster);
    setOrders(loadedOrders);
    setAuditLogs(loadedLogs);

    // Sync with Supabase if online/configured
    syncFromSupabase().then((synced) => {
      if (synced) {
        setEvents(loadEvents());
        setOrders(loadOrders());
        setMasterDatabase(loadMasterDatabase());
        setAuditLogs(loadAuditLogs());
      }
    });

    // Check existing staff session
    const existingStaff = getStaffSession();
    if (existingStaff) {
      setStaffUnlocked(true);
      setCurrentStaffUser(existingStaff);
    }

    // Hash navigation for staff
    const hash = window.location.hash.replace('#', '');
    if (isStaffTab(hash)) {
      if (existingStaff) {
        setActiveTab(hash as ActiveTab);
      } else {
        setGateTarget(hash as ActiveTab);
      }
    }
  }, []);

  // Sync active event ID
  const handleSelectEvent = useCallback((eventId: string) => {
    setCurrentEventId(eventId);
    setActiveEventId(eventId);
    if (currentStaffUser) {
      const selected = events.find((e) => e.id === eventId);
      addAuditLog(
        currentStaffUser,
        'TROCA_EVENTO_FOCO',
        `Maître selecionou o evento "${selected?.title || eventId}" (${selected?.location}).`
      );
      setAuditLogs(loadAuditLogs());
    }
  }, [events, currentStaffUser]);

  const handleSwitchTab = (tab: ActiveTab) => {
    if (tab === 'comanda') {
      setActiveTab('comanda');
      window.location.hash = 'comanda';
      return;
    }

    if (staffUnlocked) {
      setActiveTab(tab);
      window.location.hash = tab;
      return;
    }

    // Always require password modal when entering Maître area
    setGateTarget(tab);
  };

  const handleGateSubmit = async (user: StaffUser, password: string): Promise<string | null> => {
    const result = await staffSignIn(user, password);
    if (!result.ok) {
      return 'Senha incorreta para o usuário selecionado.';
    }

    setStaffUnlocked(true);
    setCurrentStaffUser(user);
    const target = gateTarget || 'admin';
    setActiveTab(target);
    window.location.hash = target;
    setGateTarget(null);
    setAuditLogs(loadAuditLogs());
    return null;
  };

  const handleGateClose = () => {
    setGateTarget(null);
    if (window.location.hash.replace('#', '') !== 'comanda') {
      window.location.hash = 'comanda';
    }
  };

  const handleSignOut = async () => {
    await staffSignOut();
    setStaffUnlocked(false);
    setCurrentStaffUser(null);
    setActiveTab('comanda');
    window.location.hash = 'comanda';
    setAuditLogs(loadAuditLogs());
  };

  // Submit Order from Guest
  const handleSubmitGuestOrder = async (order: GuestOrder, code: string) => {
    const result = await submitOrder(order, code);
    if (result.ok) {
      const updated = loadOrders();
      setOrders(updated);
      addAuditLog('CONVIDADO', 'COMANDA_EMITIDA', `Comanda ${order.code} emitida por "${order.guestName}" no evento "${order.eventTitle}".`);
      setAuditLogs(loadAuditLogs());
    }
    return result;
  };

  // Add Simulated Order from Maître
  const handleAddSimulatedOrder = (simulatedOrder: GuestOrder) => {
    insertOrder(simulatedOrder);
    setOrders(loadOrders());
    if (currentStaffUser) {
      addAuditLog(currentStaffUser, 'SIMULAÇÃO_PEDIDO', `Comanda teste ${simulatedOrder.code} gerada para "${simulatedOrder.guestName}".`);
      setAuditLogs(loadAuditLogs());
    }
  };

  // Delete Order (Maître capability)
  const handleDeleteOrder = (orderId: string) => {
    const author = currentStaffUser || 'MAÎTRE';
    deleteOrder(orderId, author);
    setOrders(loadOrders());
    setAuditLogs(loadAuditLogs());
  };

  // Update Event Config
  const handleUpdateEventConfig = (updatedConfig: EventConfig) => {
    const updatedEvents = events.map((e) => (e.id === updatedConfig.id ? updatedConfig : e));
    setEvents(updatedEvents);
    saveEvents(updatedEvents, currentStaffUser || 'MAÎTRE');
    if (currentStaffUser) {
      addAuditLog(
        currentStaffUser,
        'ATUALIZAÇÃO_EVENTO',
        `Evento "${updatedConfig.title}" alterado: Local ${updatedConfig.location}, ${updatedConfig.totalReservations} reservas.`
      );
      setAuditLogs(loadAuditLogs());
    }
  };

  // Add New Event Slot (up to 4 events)
  const handleAddNewEvent = (newEvent: EventConfig) => {
    if (events.length >= 4) return;
    const updated = [...events, newEvent];
    setEvents(updated);
    saveEvents(updated, currentStaffUser || 'MAÎTRE');
    if (currentStaffUser) {
      addAuditLog(
        currentStaffUser,
        'CRIAÇÃO_EVENTO',
        `Novo evento criado: "${newEvent.title}" no espaço ${newEvent.location}.`
      );
      setAuditLogs(loadAuditLogs());
    }
  };

  // Update Master Database
  const handleUpdateMasterDatabase = (updatedDB: MenuItem[]) => {
    setMasterDatabase(updatedDB);
    saveMasterDatabase(updatedDB);
    if (currentStaffUser) {
      addAuditLog(
        currentStaffUser,
        'ATUALIZAÇÃO_ACERVO',
        `Acervo Mestre atualizado com ${updatedDB.length} pratos/sobremesas.`
      );
      setAuditLogs(loadAuditLogs());
    }
  };

  // Reset active event to master database
  const handleResetToDefault = () => {
    const active = events.find((e) => e.id === currentEventId) || events[0];
    if (!active) return;

    if (window.confirm('Restaurar as opções deste evento com as receitas do Acervo Mestre?')) {
      const resetConfig: EventConfig = {
        ...active,
        activeDishes: masterDatabase.filter((m) => m.category === 'main').slice(0, 4),
        activeDesserts: masterDatabase.filter((m) => m.category === 'dessert').slice(0, 3),
      };
      handleUpdateEventConfig(resetConfig);
    }
  };

  const isGuestMode = activeTab === 'comanda';
  const activeEvent = events.find((e) => e.id === currentEventId) || events[0] || null;

  return (
    <div className="min-h-screen bg-[#00001f] text-neutral-100 flex flex-col relative selection:bg-[#d3a809] selection:text-neutral-950 font-sans">
      {/* Background ambient luxury lighting with hotel midnight navy & gold warmth */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(211,168,9,0.12),rgba(0,0,31,0)_80%)] no-print" />

      {/* TOP HEADER: ONLY SHOWN FOR STAFF / ADMIN PAGES */}
      {!isGuestMode && staffUnlocked && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={handleSwitchTab}
          ordersCount={orders.length}
          currentUser={currentStaffUser}
          onSignOut={handleSignOut}
          onOpenGuestComanda={() => handleSwitchTab('comanda')}
        />
      )}

      {/* MAIN VIEW */}
      <main className="relative z-10 flex-1">
        {isGuestMode ? (
          activeEvent ? (
            /* CLIENT NEVER CHOOSES EVENT - OPENS DIRECTLY FOR THEIR QR/LINK EVENT */
            <ComandaGuestView
              eventConfig={activeEvent}
              onSubmitOrder={handleSubmitGuestOrder}
              onOpenAdmin={() => handleSwitchTab('admin')}
            />
          ) : (
            <div className="min-h-screen flex items-center justify-center text-xs text-neutral-400">
              Carregando evento...
            </div>
          )
        ) : (
          staffUnlocked &&
          activeEvent && (
            <>
              {activeTab === 'admin' && (
                <AdminKitchenView
                  events={events}
                  currentEventId={currentEventId}
                  onSelectEvent={handleSelectEvent}
                  orders={orders}
                  onAddSimulatedOrder={handleAddSimulatedOrder}
                  onDeleteOrder={handleDeleteOrder}
                  onViewReceipt={(order) => setModalOrder(order)}
                  onOpenGuestComanda={() => handleSwitchTab('comanda')}
                />
              )}

              {activeTab === 'event_config' && (
                <EventConfigView
                  events={events}
                  currentEventId={currentEventId}
                  onSelectEvent={handleSelectEvent}
                  onUpdateEventConfig={handleUpdateEventConfig}
                  onAddNewEvent={handleAddNewEvent}
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

              {activeTab === 'audit_log' && (
                <AuditLogView
                  logs={auditLogs}
                  onOpenGuestComanda={() => handleSwitchTab('comanda')}
                />
              )}
            </>
          )
        )}
      </main>

      {/* MODAL RECEIPT (FOR STAFF INSPECTION) */}
      {staffUnlocked && activeEvent && (
        <ReceiptModal
          order={modalOrder}
          eventConfig={activeEvent}
          onClose={() => setModalOrder(null)}
        />
      )}

      {/* MAÎTRE AUTHENTICATION MODAL (FSOUZA, LAUGUSTO, GILSON) */}
      <MaitreGateModal
        open={gateTarget !== null}
        onClose={handleGateClose}
        onSubmit={handleGateSubmit}
      />

      {/* FOOTER: ONLY SHOWN ON ADMIN VIEWS (GUEST HAS ITS OWN MINIMAL FOOTER) */}
      {!isGuestMode && staffUnlocked && (
        <footer className="relative z-10 border-t border-white/[0.08] bg-[#00001f] py-4 px-6 text-xs text-neutral-400 no-print">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-wider text-[#d3a809] text-sm font-display">
                {HOTEL_INFO.name}
              </span>
              <span className="text-neutral-600">·</span>
              <span>GarçON Gestão Gastronômica</span>
              {isSupabaseConfigured() && (
                <span className="text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-1.5 py-0.2 rounded font-mono ml-1.5">
                  Supabase DB Conectado
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-[11px] text-neutral-400">
              <span>{HOTEL_INFO.address}</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
