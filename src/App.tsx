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
  loadEventLibrary,
  saveEventLibrary,
  loadCaixaSlots,
  allocateEventToSlot,
  CaixaSlot,
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

  // Event Library & Caixa Slots State
  const [eventLibrary, setEventLibrary] = useState<EventConfig[]>([]);
  const [caixaSlots, setCaixaSlots] = useState<CaixaSlot[]>([]);
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
  const resolveTargetEvent = (
    eventList: EventConfig[],
    slots: CaixaSlot[],
    library: EventConfig[]
  ): string => {
    // 1. Check query parameter: ?event=eve1 or ?e=eve1
    const urlParams = new URLSearchParams(window.location.search);
    const paramEvt = urlParams.get('event') || urlParams.get('e');
    const rawHash = window.location.hash.replace(/^#\/?/, '').replace(/^event\//, '');
    const pathPart = window.location.pathname.replace(/^\//, '').split('/')[0];

    const targetKey =
      paramEvt ||
      (rawHash && !isStaffTab(rawHash) && rawHash !== 'comanda' ? rawHash : null) ||
      (pathPart || null);

    if (targetKey) {
      // Check if it matches slot1, slot2, slot3, slot4 or eve1, eve2, eve3, eve4
      const slotMatch = slots.find(
        (s) =>
          s.slug === targetKey ||
          s.slotKey === targetKey ||
          `caixa${s.slotNumber}` === targetKey
      );
      if (slotMatch && slotMatch.eventId) {
        return slotMatch.eventId;
      }

      // Check if it matches an event in active allocated eventList
      const inEvents = eventList.find(
        (e) => e.id === targetKey || e.slug === targetKey || e.id.endsWith(targetKey)
      );
      if (inEvents) return inEvents.id;

      // Check in general eventLibrary
      const inLib = library.find((e) => e.id === targetKey || e.slug === targetKey);
      if (inLib) return inLib.id;
    }

    // Fallback to active event or first event
    const stored = getActiveEventId();
    return eventList.find((e) => e.id === stored)?.id || eventList[0]?.id || library[0]?.id || 'evt-raja-1';
  };

  // Initialize data on boot
  useEffect(() => {
    const loadedLib = loadEventLibrary();
    const loadedSlots = loadCaixaSlots();
    const loadedEvents = loadEvents();
    const resolvedEventId = resolveTargetEvent(loadedEvents, loadedSlots, loadedLib);
    const loadedMaster = loadMasterDatabase();
    const loadedOrders = loadOrders();
    const loadedLogs = loadAuditLogs();

    setEventLibrary(loadedLib);
    setCaixaSlots(loadedSlots);
    setEvents(loadedEvents);
    setCurrentEventId(resolvedEventId);
    setMasterDatabase(loadedMaster);
    setOrders(loadedOrders);
    setAuditLogs(loadedLogs);

    // Sync with Supabase if online/configured
    syncFromSupabase().then((synced) => {
      if (synced) {
        setEventLibrary(loadEventLibrary());
        setCaixaSlots(loadCaixaSlots());
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
      const selected = eventLibrary.find((e) => e.id === eventId) || events.find((e) => e.id === eventId);
      addAuditLog(
        currentStaffUser,
        'TROCA_EVENTO_FOCO',
        `Maître selecionou o evento "${selected?.title || eventId}" (${selected?.location}).`
      );
      setAuditLogs(loadAuditLogs());
    }
  }, [events, eventLibrary, currentStaffUser]);

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

  // Allocate Event to Caixa Slot #1, #2, #3, or #4
  const handleAllocateSlot = (slotNumber: number, eventId: string | null) => {
    const { slots, events: updatedEvents } = allocateEventToSlot(
      slotNumber,
      eventId,
      currentStaffUser || 'MAÎTRE'
    );
    setCaixaSlots([...slots]);
    setEvents([...updatedEvents]);
    setAuditLogs(loadAuditLogs());
  };

  // Create New Event in Library
  const handleCreateNewEventInLibrary = (newEvent: EventConfig, allocateToSlotNumber?: number) => {
    const updatedLib = [newEvent, ...eventLibrary];
    setEventLibrary(updatedLib);
    saveEventLibrary(updatedLib, currentStaffUser || 'MAÎTRE');

    if (allocateToSlotNumber) {
      handleAllocateSlot(allocateToSlotNumber, newEvent.id);
    }

    if (currentStaffUser) {
      addAuditLog(
        currentStaffUser,
        'CRIAÇÃO_EVENTO',
        `Novo evento criado no repositório: "${newEvent.title}" (${newEvent.location}).`
      );
      setAuditLogs(loadAuditLogs());
    }
  };

  // Delete Event from Library
  const handleDeleteEventFromLibrary = (eventId: string) => {
    if (window.confirm('Excluir este evento do repositório?')) {
      const updatedLib = eventLibrary.filter((e) => e.id !== eventId);
      setEventLibrary(updatedLib);
      saveEventLibrary(updatedLib, currentStaffUser || 'MAÎTRE');

      caixaSlots.forEach((slot) => {
        if (slot.eventId === eventId) {
          handleAllocateSlot(slot.slotNumber, null);
        }
      });
    }
  };

  // Update Event Config (in active events and library)
  const handleUpdateEventConfig = (updatedConfig: EventConfig) => {
    const updatedEvents = events.map((e) => (e.id === updatedConfig.id ? updatedConfig : e));
    setEvents(updatedEvents);
    saveEvents(updatedEvents, currentStaffUser || 'MAÎTRE');

    const updatedLib = eventLibrary.map((e) => (e.id === updatedConfig.id ? updatedConfig : e));
    setEventLibrary(updatedLib);
    saveEventLibrary(updatedLib, currentStaffUser || 'MAÎTRE');

    if (currentStaffUser) {
      addAuditLog(
        currentStaffUser,
        'ATUALIZAÇÃO_EVENTO',
        `Evento "${updatedConfig.title}" alterado: Local ${updatedConfig.location}, ${updatedConfig.totalReservations} reservas.`
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
    const active =
      eventLibrary.find((e) => e.id === currentEventId) ||
      events.find((e) => e.id === currentEventId) ||
      events[0];
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

  const handleSupabaseSynced = () => {
    setEventLibrary(loadEventLibrary());
    setCaixaSlots(loadCaixaSlots());
    setEvents(loadEvents());
    setMasterDatabase(loadMasterDatabase());
    setOrders(loadOrders());
    setAuditLogs(loadAuditLogs());
  };

  const isGuestMode = activeTab === 'comanda';
  const activeEvent =
    events.find((e) => e.id === currentEventId) ||
    eventLibrary.find((e) => e.id === currentEventId) ||
    events[0] ||
    eventLibrary[0] ||
    null;

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
              Carregando comanda do evento...
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
                  eventLibrary={eventLibrary}
                  caixaSlots={caixaSlots}
                  currentEventId={currentEventId}
                  onSelectEvent={handleSelectEvent}
                  onAllocateSlot={handleAllocateSlot}
                  onUpdateEventConfig={handleUpdateEventConfig}
                  onCreateNewEventInLibrary={handleCreateNewEventInLibrary}
                  onDeleteEventFromLibrary={handleDeleteEventFromLibrary}
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
                  events={eventLibrary}
                  orders={orders}
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

      {/* FOOTER: ONLY SHOWN ON ADMIN VIEWS */}
      {!isGuestMode && staffUnlocked && (
        <footer className="relative z-10 border-t border-white/[0.08] bg-[#00001f] py-4 px-6 text-xs text-neutral-400 no-print">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-wider text-[#d3a809] text-sm font-display">
                {HOTEL_INFO.name}
              </span>
              <span className="text-neutral-600">·</span>
              <span>GarçON Gestão Gastronômica</span>
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
