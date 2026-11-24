/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ActiveTab, EventConfig, GuestOrder, MenuItem, StaffRole, AuditLogEntry } from './types';
import { HOTEL_INFO } from './data/menuDatabase';
import { Navbar } from './components/Navbar';
import { ComandaGuestView } from './components/ComandaGuestView';
import { AdminKitchenView } from './components/AdminKitchenView';
import { WaiterDeliveryView } from './components/WaiterDeliveryView';
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
  insertOrder,
  deleteOrder,
  activateAndUpdateOrder,
  markOrderDelivered,
  unmarkOrderDelivered,
  resolveOrderStatus,
  WaiterOrderUpdatePayload,
  loadAuditLogs,
  addAuditLog,
  submitOrder,
  syncFromSupabase,
} from './lib/api';

const STAFF_TABS: ActiveTab[] = ['admin', 'waiter', 'event_config', 'database', 'audit_log'];
const isStaffTab = (t: string): t is ActiveTab => STAFF_TABS.includes(t as ActiveTab);

function parseStaffHash(rawHashValue: string): {
  tab: ActiveTab | null;
  scannedOrder: string | null;
} {
  const cleaned = rawHashValue.replace(/^#\/?/, '');
  const [pathPart, queryPart] = cleaned.split('?');
  const normalizedPath = (pathPart || '').trim().toLowerCase();

  let scannedOrder: string | null = null;
  if (queryPart) {
    const params = new URLSearchParams(queryPart);
    scannedOrder = params.get('order') || params.get('code') || null;
  }

  if (normalizedPath === 'garcom' || normalizedPath === 'waiter') {
    return { tab: 'waiter', scannedOrder };
  }
  if (isStaffTab(normalizedPath)) {
    return { tab: normalizedPath, scannedOrder };
  }
  return { tab: null, scannedOrder };
}

export default function App() {
  // Navigation: defaults to isolated guest comanda
  const [activeTab, setActiveTab] = useState<ActiveTab>('comanda');

  // Staff access: Maître (FSOUZA, LAUGUSTO, GILSON) or Garçom (dynamic name)
  const [staffUnlocked, setStaffUnlocked] = useState(false);
  const [currentStaffUser, setCurrentStaffUser] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);

  // Modal gate target: while not null the password modal is shown
  const [gateTarget, setGateTarget] = useState<ActiveTab | null>(null);

  // Deep-linked QR order code for Waiter view (#/garcom?order=CMD-XXXX)
  const [pendingScannedOrder, setPendingScannedOrder] = useState<string | null>(null);

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
    const urlParams = new URLSearchParams(window.location.search);
    const paramEvt = urlParams.get('event') || urlParams.get('e');
    const rawHash = window.location.hash
      .replace(/^#\/?/, '')
      .split('?')[0]
      .replace(/^event\//, '');
    const pathPart = window.location.pathname.replace(/^\//, '').split('/')[0];

    const isReservedHash =
      !rawHash || isStaffTab(rawHash) || rawHash === 'comanda' || rawHash === 'garcom';

    const targetKey = paramEvt || (!isReservedHash ? rawHash : null) || (pathPart || null);

    if (targetKey) {
      const slotMatch = slots.find(
        (s) =>
          s.slug === targetKey ||
          s.slotKey === targetKey ||
          `caixa${s.slotNumber}` === targetKey
      );
      if (slotMatch && slotMatch.eventId) {
        return slotMatch.eventId;
      }

      const inEvents = eventList.find(
        (e) => e.id === targetKey || e.slug === targetKey || e.id.endsWith(targetKey)
      );
      if (inEvents) return inEvents.id;

      const inLib = library.find((e) => e.id === targetKey || e.slug === targetKey);
      if (inLib) return inLib.id;
    }

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
      setCurrentStaffUser(existingStaff.username);
      setStaffRole(existingStaff.role);
    }

    // Hash navigation for staff & QR code deep links (#/garcom?order=CMD-XXXX)
    const { tab, scannedOrder } = parseStaffHash(window.location.hash);
    if (scannedOrder) {
      setPendingScannedOrder(scannedOrder);
    }

    if (tab) {
      if (existingStaff) {
        const safeTab = existingStaff.role === 'waiter' ? 'waiter' : tab;
        setActiveTab(safeTab);
      } else {
        setGateTarget(tab);
      }
    }
  }, []);

  // Listen to hashchange so scanning a QR deep link while open works cleanly
  useEffect(() => {
    const onHashChange = () => {
      const { tab, scannedOrder } = parseStaffHash(window.location.hash);
      if (scannedOrder) {
        setPendingScannedOrder(scannedOrder);
      }
      if (tab) {
        if (staffUnlocked) {
          const safeTab = staffRole === 'waiter' ? 'waiter' : tab;
          setActiveTab(safeTab);
        } else {
          setGateTarget(tab);
        }
      }
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [staffUnlocked, staffRole]);

  // Live background sync across waiters, guests, and maîtres (every 8s + focus)
  useEffect(() => {
    const refreshFromCloud = async () => {
      if (document.visibilityState !== 'visible') return;
      const synced = await syncFromSupabase();
      if (synced) {
        setEventLibrary(loadEventLibrary());
        setCaixaSlots(loadCaixaSlots());
        setEvents(loadEvents());
        setOrders(loadOrders());
        setMasterDatabase(loadMasterDatabase());
        setAuditLogs(loadAuditLogs());
      }
    };

    const intervalId = window.setInterval(refreshFromCloud, 8000);
    window.addEventListener('focus', refreshFromCloud);
    document.addEventListener('visibilitychange', refreshFromCloud);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshFromCloud);
      document.removeEventListener('visibilitychange', refreshFromCloud);
    };
  }, []);

  // Sync active event ID
  const handleSelectEvent = useCallback((eventId: string) => {
    setCurrentEventId(eventId);
    setActiveEventId(eventId);
    if (currentStaffUser && staffRole === 'maitre') {
      const selected = eventLibrary.find((e) => e.id === eventId) || events.find((e) => e.id === eventId);
      addAuditLog(
        currentStaffUser,
        'TROCA_EVENTO_FOCO',
        `Maître selecionou o evento "${selected?.title || eventId}" (${selected?.location}).`
      );
      setAuditLogs(loadAuditLogs());
    }
  }, [events, eventLibrary, currentStaffUser, staffRole]);

  const handleSwitchTab = (tab: ActiveTab) => {
    if (tab === 'comanda') {
      setActiveTab('comanda');
      window.location.hash = 'comanda';
      return;
    }

    if (staffUnlocked) {
      const safeTab = staffRole === 'waiter' ? 'waiter' : tab;
      setActiveTab(safeTab);
      window.location.hash = safeTab;
      return;
    }

    // Always require password modal when entering staff area
    setGateTarget(tab);
  };

  const handleGateSubmit = async (
    username: string,
    password: string,
    mode: StaffRole
  ): Promise<string | null> => {
    const result = await staffSignIn(username, password, mode);
    if (!result.ok) {
      if (result.error === 'missing_name') {
        return 'Informe seu nome para identificar suas entregas.';
      }
      return mode === 'waiter'
        ? 'Senha dos garçons incorreta.'
        : 'Senha incorreta para o usuário selecionado.';
    }

    setStaffUnlocked(true);
    setCurrentStaffUser(result.session.username);
    setStaffRole(result.session.role);

    const target: ActiveTab =
      result.session.role === 'waiter' ? 'waiter' : gateTarget || 'admin';
    setActiveTab(target);
    if (!pendingScannedOrder) {
      window.location.hash = target;
    }
    setGateTarget(null);
    setAuditLogs(loadAuditLogs());
    return null;
  };

  const handleGateClose = () => {
    setGateTarget(null);
    setPendingScannedOrder(null);
    if (window.location.hash.replace('#', '') !== 'comanda') {
      window.location.hash = 'comanda';
    }
  };

  const handleSignOut = async () => {
    await staffSignOut();
    setStaffUnlocked(false);
    setCurrentStaffUser(null);
    setStaffRole(null);
    setPendingScannedOrder(null);
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

  // Activate in kitchen / Edit order fields & table assignment (Waiter & Maître)
  const handleActivateAndUpdateOrder = (
    orderId: string,
    updates: WaiterOrderUpdatePayload
  ): GuestOrder | null => {
    const updatedOrder = activateAndUpdateOrder(orderId, updates, currentStaffUser || 'GARÇOM');
    setOrders(loadOrders());
    setAuditLogs(loadAuditLogs());
    return updatedOrder;
  };

  // Mark / Unmark Order Delivered (Waiter & Maître capability)
  const handleMarkOrderDelivered = (
    orderId: string,
    tableNumberOverride?: string
  ): GuestOrder | null => {
    const updatedOrder = markOrderDelivered(
      orderId,
      currentStaffUser || 'GARÇOM',
      tableNumberOverride
    );
    setOrders(loadOrders());
    setAuditLogs(loadAuditLogs());
    return updatedOrder;
  };

  const handleUnmarkOrderDelivered = (orderId: string): GuestOrder | null => {
    const updatedOrder = unmarkOrderDelivered(orderId, currentStaffUser || 'STAFF');
    setOrders(loadOrders());
    setAuditLogs(loadAuditLogs());
    return updatedOrder;
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
    const target = eventLibrary.find((e) => e.id === eventId);
    if (window.confirm('Excluir este evento do repositório?')) {
      const updatedLib = eventLibrary.filter((e) => e.id !== eventId);
      setEventLibrary(updatedLib);
      saveEventLibrary(updatedLib, currentStaffUser || 'MAÎTRE');

      caixaSlots.forEach((slot) => {
        if (slot.eventId === eventId) {
          handleAllocateSlot(slot.slotNumber, null);
        }
      });

      addAuditLog(
        currentStaffUser || 'MAÎTRE',
        'EXCLUSÃO_EVENTO',
        `Evento "${target?.title || eventId}" (${target?.location || '—'}) removido do repositório.`
      );
      setAuditLogs(loadAuditLogs());
    }
  };

  // Update Event Config (in active events and library) with detailed field diff
  const handleUpdateEventConfig = (updatedConfig: EventConfig) => {
    const previous =
      eventLibrary.find((e) => e.id === updatedConfig.id) ||
      events.find((e) => e.id === updatedConfig.id);

    const updatedEvents = events.map((e) => (e.id === updatedConfig.id ? updatedConfig : e));
    setEvents(updatedEvents);
    saveEvents(updatedEvents, currentStaffUser || 'MAÎTRE');

    const updatedLib = eventLibrary.map((e) => (e.id === updatedConfig.id ? updatedConfig : e));
    setEventLibrary(updatedLib);
    saveEventLibrary(updatedLib, currentStaffUser || 'MAÎTRE');

    const diffs: string[] = [];
    if (previous) {
      if (previous.title !== updatedConfig.title) diffs.push(`Título: "${previous.title}" → "${updatedConfig.title}"`);
      if (previous.date !== updatedConfig.date) diffs.push(`Data: ${previous.date} → ${updatedConfig.date}`);
      if (previous.time !== updatedConfig.time) diffs.push(`Horário: ${previous.time} → ${updatedConfig.time}`);
      if (previous.location !== updatedConfig.location) diffs.push(`Local: ${previous.location} → ${updatedConfig.location}`);
      if (previous.totalReservations !== updatedConfig.totalReservations) {
        diffs.push(`Reservas: ${previous.totalReservations} → ${updatedConfig.totalReservations}`);
      }
      if (previous.accessCode !== updatedConfig.accessCode) diffs.push(`Senha alterada (${updatedConfig.accessCode})`);
      if (previous.allowDessert !== updatedConfig.allowDessert) {
        diffs.push(`Sobremesa: ${previous.allowDessert ? 'Ativa' : 'Desativada'} → ${updatedConfig.allowDessert ? 'Ativa' : 'Desativada'}`);
      }
      if ((previous.coordinatorName || '') !== (updatedConfig.coordinatorName || '')) {
        diffs.push(`Responsável: "${previous.coordinatorName || '—'}" → "${updatedConfig.coordinatorName || '—'}"`);
      }
      if (previous.activeDishes.length !== updatedConfig.activeDishes.length) {
        diffs.push(`Pratos no evento: ${previous.activeDishes.length} → ${updatedConfig.activeDishes.length}`);
      }
      if (previous.activeDesserts.length !== updatedConfig.activeDesserts.length) {
        diffs.push(`Sobremesas no evento: ${previous.activeDesserts.length} → ${updatedConfig.activeDesserts.length}`);
      }
    }

    if (currentStaffUser) {
      addAuditLog(
        currentStaffUser,
        'ATUALIZAÇÃO_EVENTO',
        diffs.length > 0
          ? `Evento "${updatedConfig.title}" atualizado: ${diffs.join(' | ')}.`
          : `Evento "${updatedConfig.title}" salvo (${updatedConfig.location}, ${updatedConfig.totalReservations} reservas).`
      );
      setAuditLogs(loadAuditLogs());
    }
  };

  // Update Master Database with exact dish diff
  const handleUpdateMasterDatabase = (updatedDB: MenuItem[]) => {
    const prevIds = new Map<string, MenuItem>(masterDatabase.map((m) => [m.id, m]));
    const nextIds = new Map<string, MenuItem>(updatedDB.map((m) => [m.id, m]));

    const added = updatedDB.filter((m) => !prevIds.has(m.id)).map((m) => m.name);
    const removed = masterDatabase.filter((m) => !nextIds.has(m.id)).map((m) => m.name);
    const edited = updatedDB
      .filter((m) => {
        const old = prevIds.get(m.id);
        return old && JSON.stringify(old) !== JSON.stringify(m);
      })
      .map((m) => m.name);

    setMasterDatabase(updatedDB);
    saveMasterDatabase(updatedDB);
    if (currentStaffUser) {
      const parts: string[] = [];
      if (added.length > 0) parts.push(`Adicionados: ${added.join(', ')}`);
      if (edited.length > 0) parts.push(`Editados: ${edited.join(', ')}`);
      if (removed.length > 0) parts.push(`Removidos: ${removed.join(', ')}`);
      addAuditLog(
        currentStaffUser,
        'ATUALIZAÇÃO_ACERVO',
        parts.length > 0
          ? `Acervo Mestre (${updatedDB.length} itens): ${parts.join(' | ')}.`
          : `Acervo Mestre atualizado (${updatedDB.length} pratos/sobremesas).`
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
      addAuditLog(
        currentStaffUser || 'MAÎTRE',
        'RESTAURAÇÃO_CARDÁPIO',
        `Cardápio do evento "${active.title}" restaurado a partir do Acervo Mestre.`
      );
      setAuditLogs(loadAuditLogs());
    }
  };

  const handleLogKitchenPrint = (event: EventConfig, mode: 'pdf' | 'texto') => {
    addAuditLog(
      currentStaffUser || 'MAÎTRE',
      'IMPRESSÃO_MAPA_COZINHA',
      `Mapa de Produção (${mode.toUpperCase()}) gerado para cozinha no evento "${event.title}".`
    );
    setAuditLogs(loadAuditLogs());
  };

  const isGuestMode = activeTab === 'comanda';
  const activeEvent =
    events.find((e) => e.id === currentEventId) ||
    eventLibrary.find((e) => e.id === currentEventId) ||
    events[0] ||
    eventLibrary[0] ||
    null;

  const pendingDeliveryCount = orders.filter((o) => resolveOrderStatus(o) !== 'entregue').length;

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
          pendingDeliveryCount={pendingDeliveryCount}
          currentUser={currentStaffUser}
          staffRole={staffRole}
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
              {activeTab === 'admin' && staffRole !== 'waiter' && (
                <AdminKitchenView
                  events={events}
                  currentEventId={currentEventId}
                  onSelectEvent={handleSelectEvent}
                  orders={orders}
                  onAddSimulatedOrder={handleAddSimulatedOrder}
                  onDeleteOrder={handleDeleteOrder}
                  onViewReceipt={(order) => setModalOrder(order)}
                  onOpenGuestComanda={() => handleSwitchTab('comanda')}
                  onLogKitchenPrint={handleLogKitchenPrint}
                />
              )}

              {activeTab === 'waiter' && (
                <WaiterDeliveryView
                  events={events}
                  currentEventId={currentEventId}
                  onSelectEvent={handleSelectEvent}
                  orders={orders}
                  masterDatabase={masterDatabase}
                  staffName={currentStaffUser || 'GARÇOM'}
                  staffRole={staffRole || 'waiter'}
                  initialScannedCode={pendingScannedOrder}
                  onClearInitialScannedCode={() => setPendingScannedOrder(null)}
                  onActivateAndUpdateOrder={handleActivateAndUpdateOrder}
                  onMarkDelivered={handleMarkOrderDelivered}
                  onUnmarkDelivered={handleUnmarkOrderDelivered}
                />
              )}

              {activeTab === 'event_config' && staffRole !== 'waiter' && (
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

              {activeTab === 'database' && staffRole !== 'waiter' && (
                <MasterDatabaseView
                  masterDatabase={masterDatabase}
                  onUpdateMasterDatabase={handleUpdateMasterDatabase}
                  onOpenGuestComanda={() => handleSwitchTab('comanda')}
                />
              )}

              {activeTab === 'audit_log' && staffRole !== 'waiter' && (
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

      {/* STAFF AUTHENTICATION MODAL (MAÎTRE OR GARÇOM) */}
      <MaitreGateModal
        open={gateTarget !== null}
        initialMode={gateTarget === 'waiter' ? 'waiter' : 'maitre'}
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
