import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { EventConfig, GuestOrder, MenuItem, OrderStatus, StaffRole } from '../types';
import { resolveOrderStatus, WaiterOrderUpdatePayload } from '../lib/api';
import { DietaryIcons } from './DietaryIcons';
import {
  QrCode,
  Search,
  CheckCircle2,
  Clock,
  Camera,
  CameraOff,
  X,
  Utensils,
  Cake,
  GlassWater,
  AlertTriangle,
  RotateCcw,
  MapPin,
  Flame,
  Pencil,
  Save,
  History,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';

interface WaiterDeliveryViewProps {
  events: EventConfig[];
  currentEventId: string;
  onSelectEvent: (id: string) => void;
  orders: GuestOrder[];
  masterDatabase: MenuItem[];
  staffName: string;
  staffRole: StaffRole;
  initialScannedCode?: string | null;
  onClearInitialScannedCode?: () => void;
  onActivateAndUpdateOrder: (
    orderId: string,
    updates: WaiterOrderUpdatePayload
  ) => GuestOrder | null;
  onMarkDelivered: (orderId: string, tableNumberOverride?: string) => GuestOrder | null;
  onUnmarkDelivered: (orderId: string) => GuestOrder | null;
}

type QueueTab = 'meus' | 'producao' | 'todos';
type TodosSubFilter = 'all' | 'aguardando' | 'em_producao' | 'entregue';

function extractOrderIdentifier(rawText: string): string {
  const trimmed = rawText.trim();
  if (!trimmed) return '';

  try {
    const queryIdx = trimmed.indexOf('?');
    if (queryIdx !== -1) {
      const params = new URLSearchParams(trimmed.slice(queryIdx + 1));
      const orderParam = params.get('order') || params.get('code') || params.get('id');
      if (orderParam) return orderParam.trim().toUpperCase();
    }
  } catch {
    // ignore URL parse error
  }

  const cmdMatch = trimmed.match(/CMD-[A-Z0-9]+/i);
  if (cmdMatch) return cmdMatch[0].toUpperCase();

  return trimmed.toUpperCase();
}

function formatTableBadge(raw?: string): string {
  if (!raw || !raw.trim()) return 'Sem mesa';
  const clean = raw.trim();
  return /^mesa\s+/i.test(clean) ? clean : `Mesa ${clean}`;
}

export const WaiterDeliveryView: React.FC<WaiterDeliveryViewProps> = ({
  events,
  currentEventId,
  onSelectEvent,
  orders,
  masterDatabase,
  staffName,
  initialScannedCode,
  onClearInitialScannedCode,
  onActivateAndUpdateOrder,
  onMarkDelivered,
  onUnmarkDelivered,
}) => {
  const normalizedStaffName = staffName.trim().toUpperCase() || 'GARÇOM';

  const [scopeAllEvents, setScopeAllEvents] = useState<boolean>(false);
  const [eventDropdownOpen, setEventDropdownOpen] = useState<boolean>(false);
  const [queueTab, setQueueTab] = useState<QueueTab>('todos');
  const [todosSubFilter, setTodosSubFilter] = useState<TodosSubFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );

  // Modal editing state
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [editGuestName, setEditGuestName] = useState('');
  const [editTableNumber, setEditTableNumber] = useState('');
  const [editMainDishId, setEditMainDishId] = useState('');
  const [editDessertId, setEditDessertId] = useState<string>('__none__');
  const [editNotes, setEditNotes] = useState('');
  const [editAssignedWaiter, setEditAssignedWaiter] = useState('');
  const [modalAlert, setModalAlert] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );

  // Camera QR Scanner state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const eventMenuRef = useRef<HTMLDivElement | null>(null);
  const initialTabChosenRef = useRef(false);

  const activeEvent = events.find((e) => e.id === currentEventId) || events[0] || null;

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  // Close event dropdown when clicking outside
  useEffect(() => {
    if (!eventDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (eventMenuRef.current && !eventMenuRef.current.contains(e.target as Node)) {
        setEventDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [eventDropdownOpen]);

  // Sync modal edit fields whenever a different order is opened
  useEffect(() => {
    if (selectedOrder) {
      setEditGuestName(selectedOrder.guestName);
      setEditTableNumber(selectedOrder.tableNumber || '');
      setEditMainDishId(selectedOrder.mainDish.id);
      setEditDessertId(selectedOrder.dessert ? selectedOrder.dessert.id : '__none__');
      setEditNotes(selectedOrder.notes || '');
      setEditAssignedWaiter(selectedOrder.assignedWaiter || normalizedStaffName);
      setIsEditingOrder(false);
      setShowOrderHistory(false);
      setModalAlert(null);
    }
  }, [selectedOrder?.id, normalizedStaffName]);

  // Available dishes & desserts for editing
  const { dishOptions, dessertOptions } = useMemo(() => {
    const orderEvent = selectedOrder
      ? events.find((e) => e.id === selectedOrder.eventId) || activeEvent
      : activeEvent;

    const dishMap = new Map<string, MenuItem>();
    orderEvent?.activeDishes.forEach((d) => dishMap.set(d.id, d));
    masterDatabase.filter((m) => m.category === 'main').forEach((d) => {
      if (!dishMap.has(d.id)) dishMap.set(d.id, d);
    });
    if (selectedOrder?.mainDish && !dishMap.has(selectedOrder.mainDish.id)) {
      dishMap.set(selectedOrder.mainDish.id, selectedOrder.mainDish);
    }

    const dessertMap = new Map<string, MenuItem>();
    orderEvent?.activeDesserts.forEach((d) => dessertMap.set(d.id, d));
    masterDatabase.filter((m) => m.category === 'dessert').forEach((d) => {
      if (!dessertMap.has(d.id)) dessertMap.set(d.id, d);
    });
    if (selectedOrder?.dessert && !dessertMap.has(selectedOrder.dessert.id)) {
      dessertMap.set(selectedOrder.dessert.id, selectedOrder.dessert);
    }

    return {
      dishOptions: Array.from(dishMap.values()),
      dessertOptions: Array.from(dessertMap.values()),
    };
  }, [selectedOrder, events, activeEvent, masterDatabase]);

  const openOrderByCode = useCallback(
    (rawPayload: string) => {
      const token = extractOrderIdentifier(rawPayload);
      if (!token) return false;

      const found = orders.find(
        (o) =>
          o.code.toUpperCase() === token ||
          o.id.toUpperCase() === token ||
          o.authCode.toUpperCase() === token
      );

      if (found) {
        setSelectedOrderId(found.id);
        setScanFeedback(null);
        if (found.eventId && events.some((e) => e.id === found.eventId)) {
          onSelectEvent(found.eventId);
        }
        return true;
      }

      setScanFeedback({
        type: 'error',
        text: `Comanda "${token}" não encontrada.`,
      });
      return false;
    },
    [orders, events, onSelectEvent]
  );

  useEffect(() => {
    if (!initialScannedCode) return;
    openOrderByCode(initialScannedCode);
    onClearInitialScannedCode?.();
  }, [initialScannedCode, openOrderByCode, onClearInitialScannedCode]);

  const stopScanner = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScannerOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startScanner = async () => {
    setCameraError('');
    setScanFeedback(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Câmera indisponível neste navegador. Use a busca por CMD.');
      setScannerOpen(true);
      return;
    }

    setScannerOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      const tick = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code && code.data) {
              const matched = openOrderByCode(code.data);
              stopScanner();
              if (!matched) {
                setScanFeedback({
                  type: 'error',
                  text: `QR lido (${extractOrderIdentifier(code.data)}), mas não localizado.`,
                });
              }
              return;
            }
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setCameraError('Sem permissão de câmera. Digite o código CMD na busca.');
    }
  };

  // Scope orders to selected event (or all active events)
  const scopedOrders = useMemo(() => {
    if (scopeAllEvents || !activeEvent) return orders;
    return orders.filter(
      (o) => o.eventId === activeEvent.id || o.eventTitle === activeEvent.title
    );
  }, [orders, scopeAllEvents, activeEvent]);

  // Metrics
  const stats = useMemo(() => {
    const total = scopedOrders.length;
    let awaiting = 0;
    let inProduction = 0;
    let delivered = 0;

    scopedOrders.forEach((o) => {
      const st = resolveOrderStatus(o);
      if (st === 'entregue') delivered += 1;
      else if (st === 'em_producao') inProduction += 1;
      else awaiting += 1;
    });

    return {
      total,
      awaiting,
      inProduction,
      delivered,
      remaining: total - delivered,
    };
  }, [scopedOrders]);

  // My orders (assigned to logged-in waiter)
  const myOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return scopedOrders
      .filter((o) => (o.assignedWaiter || '').toUpperCase() === normalizedStaffName)
      .filter((o) => {
        if (!q) return true;
        return (
          o.guestName.toLowerCase().includes(q) ||
          o.code.toLowerCase().includes(q) ||
          o.mainDish.name.toLowerCase().includes(q) ||
          (o.tableNumber || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const stA = resolveOrderStatus(a);
        const stB = resolveOrderStatus(b);
        const weight = (st: OrderStatus) => (st === 'em_producao' ? 0 : st === 'aguardando' ? 1 : 2);
        const diff = weight(stA) - weight(stB);
        if (diff !== 0) return diff;
        return a.guestName.localeCompare(b.guestName, 'pt-BR', { sensitivity: 'base' });
      });
  }, [scopedOrders, normalizedStaffName, searchTerm]);

  const myActiveCount = useMemo(
    () =>
      scopedOrders.filter(
        (o) =>
          (o.assignedWaiter || '').toUpperCase() === normalizedStaffName &&
          resolveOrderStatus(o) === 'em_producao'
      ).length,
    [scopedOrders, normalizedStaffName]
  );

  // Pick smart default tab once on load: Meus if waiter already has active dishes, else Em Produção if any exist, else Todos
  useEffect(() => {
    if (initialTabChosenRef.current) return;
    if (scopedOrders.length === 0) return;
    initialTabChosenRef.current = true;
    if (myActiveCount > 0) {
      setQueueTab('meus');
    } else if (stats.inProduction > 0) {
      setQueueTab('producao');
    } else {
      setQueueTab('todos');
    }
  }, [scopedOrders.length, myActiveCount, stats.inProduction]);

  // Orders currently in production across ALL waiters
  const productionOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return scopedOrders
      .filter((o) => resolveOrderStatus(o) === 'em_producao')
      .filter((o) => {
        if (!q) return true;
        return (
          o.guestName.toLowerCase().includes(q) ||
          o.code.toLowerCase().includes(q) ||
          o.mainDish.name.toLowerCase().includes(q) ||
          (o.tableNumber || '').toLowerCase().includes(q) ||
          (o.assignedWaiter || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // Mine first, then alphabetical
        const aMine = (a.assignedWaiter || '').toUpperCase() === normalizedStaffName ? 0 : 1;
        const bMine = (b.assignedWaiter || '').toUpperCase() === normalizedStaffName ? 0 : 1;
        if (aMine !== bMine) return aMine - bMine;
        return a.guestName.localeCompare(b.guestName, 'pt-BR', { sensitivity: 'base' });
      });
  }, [scopedOrders, searchTerm, normalizedStaffName]);

  // All orders (A-Z)
  const allFilteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return [...scopedOrders]
      .filter((o) => {
        const st = resolveOrderStatus(o);
        if (todosSubFilter !== 'all' && st !== todosSubFilter) return false;
        if (!q) return true;
        return (
          o.guestName.toLowerCase().includes(q) ||
          o.code.toLowerCase().includes(q) ||
          o.mainDish.name.toLowerCase().includes(q) ||
          (o.tableNumber || '').toLowerCase().includes(q) ||
          (o.assignedWaiter || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) =>
        a.guestName.localeCompare(b.guestName, 'pt-BR', { sensitivity: 'base' })
      );
  }, [scopedOrders, todosSubFilter, searchTerm]);

  const handleQuickLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    openOrderByCode(searchTerm);
  };

  const buildModalPayload = (activate: boolean): WaiterOrderUpdatePayload => {
    const chosenDish = dishOptions.find((d) => d.id === editMainDishId) || selectedOrder?.mainDish;
    const chosenDessert =
      editDessertId === '__none__'
        ? null
        : dessertOptions.find((d) => d.id === editDessertId) || selectedOrder?.dessert || null;

    return {
      guestName: editGuestName,
      mainDish: chosenDish,
      dessert: chosenDessert,
      notes: editNotes,
      tableNumber: editTableNumber,
      assignedWaiter: editAssignedWaiter || normalizedStaffName,
      activate,
    };
  };

  const handleActivateInKitchen = () => {
    if (!selectedOrder) return;
    if (!editTableNumber.trim()) {
      setModalAlert({
        type: 'error',
        text: 'Informe o número da Mesa para ativar.',
      });
      return;
    }

    const updated = onActivateAndUpdateOrder(selectedOrder.id, buildModalPayload(true));
    if (updated) {
      setIsEditingOrder(false);
      setModalAlert({
        type: 'success',
        text: `Ativado na cozinha · ${formatTableBadge(updated.tableNumber)} (${updated.assignedWaiter}).`,
      });
    }
  };

  const handleSaveOrderEdits = () => {
    if (!selectedOrder) return;
    const updated = onActivateAndUpdateOrder(selectedOrder.id, buildModalPayload(false));
    if (updated) {
      setIsEditingOrder(false);
      setModalAlert({
        type: 'success',
        text: 'Pedido atualizado.',
      });
    }
  };

  const handleDeliverFromModal = () => {
    if (!selectedOrder) return;
    const currentStatus = resolveOrderStatus(selectedOrder);
    if (currentStatus === 'aguardando' && !editTableNumber.trim()) {
      setModalAlert({
        type: 'error',
        text: 'Defina a Mesa antes de entregar.',
      });
      return;
    }

    onActivateAndUpdateOrder(selectedOrder.id, buildModalPayload(false));
    const delivered = onMarkDelivered(selectedOrder.id, editTableNumber);
    if (delivered) {
      setIsEditingOrder(false);
      setModalAlert(null);
    }
  };

  const selectedStatus: OrderStatus = selectedOrder
    ? resolveOrderStatus(selectedOrder)
    : 'aguardando';

  const displayedList =
    queueTab === 'meus' ? myOrders : queueTab === 'producao' ? productionOrders : allFilteredOrders;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-5 py-4 space-y-3.5 animate-fade-in">
      {/* 1. COMPACT EVENT SWITCHER + REMAINING COUNTER BAR */}
      <div className="flex items-center justify-between gap-2 bg-black/45 border border-white/[0.08] rounded-xl px-3 py-2 relative z-30">
        {/* Clean Event Selector Dropdown */}
        <div className="relative min-w-0 flex-1" ref={eventMenuRef}>
          <button
            type="button"
            onClick={() => events.length > 1 && setEventDropdownOpen((v) => !v)}
            className={`w-full flex items-center gap-2 text-left rounded-lg py-0.5 transition-colors ${
              events.length > 1 ? 'cursor-pointer hover:text-[#f0cb40]' : 'cursor-default'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#d3a809] shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
                <span className="truncate">
                  {scopeAllEvents
                    ? `Todos os Eventos (${events.length})`
                    : activeEvent?.title || 'Evento'}
                </span>
                {events.length > 1 && (
                  <ChevronDown className="w-3.5 h-3.5 text-[#d3a809] shrink-0" />
                )}
              </div>
              {!scopeAllEvents && activeEvent && (
                <div className="text-[10px] text-neutral-400 truncate flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5 text-[#d3a809]" />
                  <span>{activeEvent.location}</span>
                </div>
              )}
            </div>
          </button>

          {eventDropdownOpen && events.length > 1 && (
            <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 rounded-xl bg-[#090d26] border border-[#d3a809]/35 shadow-2xl p-1.5 space-y-1 z-50">
              {events.map((evt, idx) => {
                const evtRemaining = orders.filter(
                  (o) =>
                    (o.eventId === evt.id || o.eventTitle === evt.title) &&
                    resolveOrderStatus(o) !== 'entregue'
                ).length;
                const isSelected = !scopeAllEvents && activeEvent?.id === evt.id;

                return (
                  <button
                    key={evt.id}
                    type="button"
                    onClick={() => {
                      setScopeAllEvents(false);
                      onSelectEvent(evt.id);
                      setEventDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#d3a809] text-neutral-950 font-bold'
                        : 'text-neutral-200 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate">
                        <span className="font-mono opacity-75 mr-1.5">#{idx + 1}</span>
                        {evt.title}
                      </div>
                      <div
                        className={`text-[10px] truncate ${
                          isSelected ? 'text-neutral-900/80' : 'text-neutral-400'
                        }`}
                      >
                        {evt.location}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                        isSelected
                          ? 'bg-black/15 text-neutral-950'
                          : 'bg-white/[0.06] text-amber-300'
                      }`}
                    >
                      faltam {evtRemaining}
                    </span>
                  </button>
                );
              })}

              <div className="pt-1 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    setScopeAllEvents(true);
                    setEventDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between cursor-pointer ${
                    scopeAllEvents
                      ? 'bg-white text-neutral-950 font-bold'
                      : 'text-neutral-300 hover:bg-white/[0.06]'
                  }`}
                >
                  <span>Todos os Eventos Ativos</span>
                  <span className="font-mono text-[10px]">{orders.length}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Ultra-Compact Live Counter: Faltam X / Total */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/35 text-[11px] font-mono">
            <span className="text-amber-300 font-bold">Faltam {stats.remaining}</span>
            <span className="text-neutral-400">/{stats.total}</span>
          </div>
          {stats.inProduction > 0 && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-[11px] font-mono text-sky-200 font-bold">
              <Flame className="w-3 h-3 text-sky-300" />
              {stats.inProduction}
            </div>
          )}
        </div>
      </div>

      {/* 2. HERO ACTION: SCAN QR CODE FIRST + INSTANT SEARCH */}
      <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
        <button
          type="button"
          onClick={scannerOpen ? stopScanner : startScanner}
          className={`px-5 py-3.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg active:scale-[0.98] shrink-0 ${
            scannerOpen
              ? 'bg-rose-500/20 text-rose-200 border border-rose-500/40 hover:bg-rose-500/30'
              : 'bg-gradient-to-r from-[#d3a809] to-[#b38b00] hover:from-[#e3b819] hover:to-[#c49800] text-neutral-950'
          }`}
        >
          {scannerOpen ? (
            <>
              <CameraOff className="w-4 h-4" />
              Fechar Câmera
            </>
          ) : (
            <>
              <QrCode className="w-5 h-5 stroke-[2.2]" />
              Escanear QR Code
            </>
          )}
        </button>

        <form onSubmit={handleQuickLookupSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setScanFeedback(null);
              }}
              placeholder="Buscar nome, mesa, garçom ou CMD..."
              className="w-full pl-10 pr-8 py-3 bg-black/50 border border-white/[0.12] focus:border-[#d3a809] rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 outline-none transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1 cursor-pointer"
                aria-label="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {searchTerm.trim().toUpperCase().startsWith('CMD-') && (
            <button
              type="submit"
              className="px-4 py-3 rounded-xl bg-white/[0.1] hover:bg-white/[0.18] border border-white/[0.15] text-xs font-bold text-white cursor-pointer shrink-0"
            >
              Abrir
            </button>
          )}
        </form>
      </div>

      {/* LIVE CAMERA SCANNER PANEL (ONLY WHEN OPEN) */}
      {scannerOpen && (
        <div className="rounded-xl bg-black/80 border border-[#d3a809]/40 p-3 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#d3a809] font-semibold flex items-center gap-1.5">
              <Camera className="w-4 h-4" />
              Aponte para o QR Code da comanda
            </span>
            <button
              type="button"
              onClick={stopScanner}
              className="text-neutral-400 hover:text-white p-1 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {cameraError ? (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{cameraError}</span>
            </div>
          ) : (
            <div className="relative w-full max-w-xs mx-auto aspect-square rounded-xl overflow-hidden bg-black border border-white/10">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 relative">
                  <span className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#d3a809] rounded-tl" />
                  <span className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#d3a809] rounded-tr" />
                  <span className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#d3a809] rounded-bl" />
                  <span className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#d3a809] rounded-br" />
                </div>
              </div>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {scanFeedback && (
        <div className="flex items-center justify-between gap-2 text-xs text-rose-200 bg-rose-500/10 border border-rose-500/25 px-3 py-2 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{scanFeedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setScanFeedback(null)}
            className="text-rose-300 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. SEGMENTED QUEUE SWITCHER: MEUS | EM PRODUÇÃO | TODOS */}
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/50 border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setQueueTab('meus')}
            className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              queueTab === 'meus'
                ? 'bg-[#d3a809] text-neutral-950 shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span>Meus</span>
            <span
              className={`font-mono text-[10px] px-1.5 py-0.2 rounded ${
                queueTab === 'meus'
                  ? 'bg-black/15 text-neutral-950'
                  : myActiveCount > 0
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'bg-white/[0.08] text-neutral-400'
              }`}
            >
              {myOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setQueueTab('producao')}
            className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              queueTab === 'producao'
                ? 'bg-sky-400 text-neutral-950 shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Flame className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Em Produção</span>
            <span
              className={`font-mono text-[10px] px-1.5 py-0.2 rounded ${
                queueTab === 'producao'
                  ? 'bg-black/15 text-neutral-950'
                  : 'bg-sky-500/20 text-sky-300'
              }`}
            >
              {stats.inProduction}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setQueueTab('todos')}
            className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              queueTab === 'todos'
                ? 'bg-white text-neutral-950 shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span>Todos A–Z</span>
            <span
              className={`font-mono text-[10px] px-1.5 py-0.2 rounded ${
                queueTab === 'todos'
                  ? 'bg-black/15 text-neutral-950'
                  : 'bg-white/[0.08] text-neutral-400'
              }`}
            >
              {stats.total}
            </span>
          </button>
        </div>

        {/* Sub-filter only when on "Todos A-Z" */}
        {queueTab === 'todos' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {(
              [
                { key: 'all', label: `Todos (${stats.total})` },
                { key: 'aguardando', label: `Aguardando (${stats.awaiting})` },
                { key: 'em_producao', label: `Em Produção (${stats.inProduction})` },
                { key: 'entregue', label: `Entregues (${stats.delivered})` },
              ] as const
            ).map((sub) => (
              <button
                key={sub.key}
                type="button"
                onClick={() => setTodosSubFilter(sub.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors border ${
                  todosSubFilter === sub.key
                    ? 'bg-[#d3a809]/20 border-[#d3a809]/50 text-[#f0cb40]'
                    : 'bg-white/[0.03] border-white/[0.06] text-neutral-400 hover:text-white'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. ACTIVE ORDER LIST */}
      {displayedList.length === 0 ? (
        <div className="glass-panel rounded-2xl p-6 text-center text-xs text-neutral-400 border border-dashed border-white/[0.1]">
          {queueTab === 'meus'
            ? `Nenhum pedido vinculado a ${normalizedStaffName}. Escaneie o QR Code na mesa para ativar.`
            : queueTab === 'producao'
            ? 'Nenhum pedido em produção no momento.'
            : 'Nenhum pedido encontrado.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {displayedList.map((order) => {
            const st = resolveOrderStatus(order);
            const isDelivered = st === 'entregue';
            const isProd = st === 'em_producao';
            const ownerWaiter = order.assignedWaiter;
            const isMine = !!ownerWaiter && ownerWaiter.toUpperCase() === normalizedStaffName;
            const isOtherWaiter = !!ownerWaiter && !isMine;
            const isDetailedView = queueTab === 'meus';

            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedOrderId(order.id);
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2.5 active:scale-[0.99] ${
                  isProd
                    ? 'bg-[#09122e] border-sky-400/40 hover:border-[#d3a809] shadow-md'
                    : isDelivered
                    ? 'bg-white/[0.02] border-emerald-500/20 opacity-80 hover:opacity-100'
                    : 'glass-card border-white/[0.1] hover:border-[#d3a809]/50'
                }`}
              >
                {/* Top Row: Mesa + Guest Name + Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {order.tableNumber ? (
                        <span className="px-2 py-0.5 rounded-md bg-[#d3a809] text-neutral-950 font-mono text-[11px] font-black">
                          {formatTableBadge(order.tableNumber)}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-neutral-400 font-mono text-[10px]">
                          Sem mesa
                        </span>
                      )}

                      <span className="font-mono text-[11px] font-bold text-[#d3a809]">
                        {order.code}
                      </span>

                      {/* Waiter Tag (always shown on Salão / Em Produção / Todos) */}
                      {!isDetailedView && ownerWaiter && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                            isOtherWaiter
                              ? 'bg-violet-500/15 border-violet-400/35 text-violet-200'
                              : 'bg-[#d3a809]/20 border-[#d3a809]/40 text-[#f0cb40]'
                          }`}
                        >
                          {ownerWaiter}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white uppercase tracking-tight truncate">
                      {order.guestName}
                    </h3>
                  </div>

                  {/* Status Pill */}
                  {isDelivered ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/15 border border-red-500/40 text-red-400 text-[10px] font-black uppercase tracking-wider shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      Entregue
                    </span>
                  ) : isProd ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-400/40 text-sky-200 text-[10px] font-bold uppercase tracking-wider shrink-0">
                      <Flame className="w-3 h-3" />
                      Produção
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider shrink-0">
                      <Clock className="w-3 h-3" />
                      Aguardando
                    </span>
                  )}
                </div>

                {/* Dish Details */}
                <div className="space-y-1 text-xs pt-1.5 border-t border-white/[0.06]">
                  <div className="text-neutral-100 font-medium flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5 text-[#d3a809] shrink-0" />
                    <span className={isDetailedView ? '' : 'truncate'}>{order.mainDish.name}</span>
                  </div>

                  {isDetailedView && order.mainDish.dietary && order.mainDish.dietary.length > 0 && (
                    <div className="pl-5">
                      <DietaryIcons tags={order.mainDish.dietary} />
                    </div>
                  )}

                  {order.dessert && (
                    <div className="text-neutral-400 flex items-center gap-1.5">
                      <Cake className="w-3.5 h-3.5 text-[#d3a809]/70 shrink-0" />
                      <span className={isDetailedView ? '' : 'truncate'}>{order.dessert.name}</span>
                    </div>
                  )}

                  {isDetailedView && (
                    <div className="text-neutral-400 flex items-center gap-1.5">
                      <GlassWater className="w-3.5 h-3.5 text-[#d3a809]/70 shrink-0" />
                      <span>01 Bebida Não Alcoólica (01 und)</span>
                    </div>
                  )}

                  {order.notes && (
                    <div className="text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1 text-[11px] flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span className={isDetailedView ? '' : 'truncate'}>{order.notes}</span>
                    </div>
                  )}
                </div>

                {/* Quick 1-Tap Deliver Action when In Production */}
                {isProd && (
                  <div
                    className="flex items-center justify-end gap-2 pt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => onMarkDelivered(order.id)}
                      className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-extrabold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      {isOtherWaiter ? 'Ajudar · ' : ''}Entregar na{' '}
                      {formatTableBadge(order.tableNumber)}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* INTERNAL WAITER ORDER VIEW MODAL */}
      {selectedOrder && (
        <div
          onClick={() => setSelectedOrderId(null)}
          className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 cursor-pointer no-print overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Ficha do Pedido"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg my-auto rounded-2xl bg-[#070a1f] border border-[#d3a809]/40 shadow-2xl overflow-hidden cursor-default relative max-h-[92vh] flex flex-col"
          >
            {/* RED RUBBER STAMP ("ENTREGUE") */}
            {selectedStatus === 'entregue' && (
              <div
                aria-label="Pedido Entregue"
                className="pointer-events-none select-none absolute top-14 right-5 sm:right-7 z-20 -rotate-12 transform transition-all duration-300"
              >
                <div className="px-4 py-2 rounded-lg border-[4px] border-red-500/90 bg-red-950/35 backdrop-blur-[1px] shadow-[0_0_25px_rgba(239,68,68,0.28)]">
                  <div className="border border-red-400/50 px-3 py-1 rounded">
                    <div className="text-2xl sm:text-3xl font-black tracking-[0.22em] text-red-500 uppercase leading-none text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      ENTREGUE
                    </div>
                    <div className="text-[9px] font-mono font-bold text-red-300 uppercase tracking-wider text-center mt-1">
                      {selectedOrder.deliveredBy || 'GARÇOM'}
                      {selectedOrder.tableNumber
                        ? ` · ${formatTableBadge(selectedOrder.tableNumber)}`
                        : ''}
                    </div>
                    {selectedOrder.deliveredAt && (
                      <div className="text-[8px] font-mono text-red-300/80 text-center">
                        {selectedOrder.deliveredAt}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Header */}
            <div className="px-4 sm:px-5 py-3.5 bg-white/[0.03] border-b border-white/[0.08] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-[#d3a809]">
                  {selectedOrder.code}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    selectedStatus === 'entregue'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : selectedStatus === 'em_producao'
                      ? 'bg-sky-500/20 text-sky-200 border border-sky-400/40'
                      : 'bg-amber-500/20 text-amber-200 border border-amber-400/35'
                  }`}
                >
                  {selectedStatus === 'entregue'
                    ? 'Entregue'
                    : selectedStatus === 'em_producao'
                    ? 'Em Produção'
                    : 'Aguardando Mesa'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingOrder((v) => !v);
                    setModalAlert(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                    isEditingOrder
                      ? 'bg-[#d3a809] text-neutral-950 border-[#d3a809]'
                      : 'bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 border-white/[0.1]'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {isEditingOrder ? 'Fechar Edição' : 'Editar'}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOrderId(null)}
                  className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white cursor-pointer"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-5 space-y-4 relative z-10 overflow-y-auto">
              {/* Guest Name + Quick Table Input */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 pr-16 sm:pr-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-white uppercase font-display tracking-tight leading-tight">
                    {selectedOrder.guestName}
                  </h2>
                  <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                    <span>{selectedOrder.eventLocation}</span>
                    {selectedOrder.assignedWaiter && (
                      <>
                        <span>·</span>
                        <span className="text-[#d3a809] font-mono font-bold">
                          Garçom: {selectedOrder.assignedWaiter}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-[#d3a809]/10 border border-[#d3a809]/35 rounded-xl px-3 py-1.5 shrink-0 self-start sm:self-auto">
                  <span className="text-[11px] font-bold uppercase text-[#d3a809]">Mesa:</span>
                  <input
                    type="text"
                    value={editTableNumber}
                    onChange={(e) => {
                      setEditTableNumber(e.target.value);
                      setModalAlert(null);
                    }}
                    placeholder="Nº"
                    className="w-16 px-2 py-1 bg-black/60 border border-[#d3a809]/40 focus:border-[#f0cb40] rounded-lg text-sm font-mono font-bold text-white text-center placeholder-neutral-500 outline-none"
                  />
                </div>
              </div>

              {/* INLINE EDITOR OR COMPACT ORDER SUMMARY */}
              {isEditingOrder ? (
                <div className="p-3.5 rounded-xl bg-white/[0.04] border border-[#d3a809]/35 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-neutral-400 font-semibold">
                        Convidado
                      </label>
                      <input
                        type="text"
                        value={editGuestName}
                        onChange={(e) => setEditGuestName(e.target.value)}
                        className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-xs text-white outline-none focus:border-[#d3a809]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-neutral-400 font-semibold">
                        Garçom Responsável
                      </label>
                      <input
                        type="text"
                        value={editAssignedWaiter}
                        onChange={(e) => setEditAssignedWaiter(e.target.value.toUpperCase())}
                        placeholder={normalizedStaffName}
                        className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-xs text-white font-mono uppercase outline-none focus:border-[#d3a809]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-neutral-400 font-semibold">
                      Prato Principal
                    </label>
                    <select
                      value={editMainDishId}
                      onChange={(e) => setEditMainDishId(e.target.value)}
                      className="w-full px-3 py-2 bg-black/60 border border-white/[0.12] rounded-xl text-xs text-white outline-none focus:border-[#d3a809]"
                    >
                      {dishOptions.map((dish) => (
                        <option key={dish.id} value={dish.id} className="bg-[#070a1f] text-white">
                          {dish.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-neutral-400 font-semibold">
                      Sobremesa
                    </label>
                    <select
                      value={editDessertId}
                      onChange={(e) => setEditDessertId(e.target.value)}
                      className="w-full px-3 py-2 bg-black/60 border border-white/[0.12] rounded-xl text-xs text-white outline-none focus:border-[#d3a809]"
                    >
                      <option value="__none__" className="bg-[#070a1f] text-neutral-300">
                        Sem sobremesa
                      </option>
                      {dessertOptions.map((dessert) => (
                        <option
                          key={dessert.id}
                          value={dessert.id}
                          className="bg-[#070a1f] text-white"
                        >
                          {dessert.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-neutral-400 font-semibold">
                      Observações / Restrições
                    </label>
                    <textarea
                      rows={2}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-xs text-white outline-none focus:border-[#d3a809]"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingOrder(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-neutral-300 hover:bg-white/[0.06] cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveOrderEdits}
                      className="px-4 py-1.5 rounded-lg bg-[#d3a809] hover:bg-[#e3b819] text-neutral-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
                  <div className="space-y-1">
                    <div className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <Utensils className="w-4 h-4 text-[#d3a809] shrink-0" />
                      <span>{selectedOrder.mainDish.name}</span>
                    </div>
                    {selectedOrder.mainDish.dietary && selectedOrder.mainDish.dietary.length > 0 && (
                      <div className="pl-6">
                        <DietaryIcons tags={selectedOrder.mainDish.dietary} />
                      </div>
                    )}
                  </div>

                  {selectedOrder.dessert && (
                    <div className="text-xs sm:text-sm text-neutral-200 flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                      <Cake className="w-4 h-4 text-[#d3a809]/80 shrink-0" />
                      <span>{selectedOrder.dessert.name}</span>
                    </div>
                  )}

                  <div className="text-xs text-neutral-400 flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                    <GlassWater className="w-3.5 h-3.5 text-[#d3a809]/70 shrink-0" />
                    <span>01 Bebida Não Alcoólica (01 und)</span>
                  </div>

                  {selectedOrder.notes && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-100 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{selectedOrder.notes}</span>
                    </div>
                  )}
                </div>
              )}

              {modalAlert && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                    modalAlert.type === 'error'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{modalAlert.text}</span>
                </div>
              )}

              {/* PRIMARY WORKFLOW ACTIONS */}
              <div className="space-y-2 pt-1">
                {!isEditingOrder && editTableNumber.trim() !== (selectedOrder.tableNumber || '') && (
                  <button
                    type="button"
                    onClick={handleSaveOrderEdits}
                    className="w-full py-2.5 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.15] text-white font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-[#d3a809]" />
                    Salvar Mesa ({formatTableBadge(editTableNumber)})
                  </button>
                )}

                {selectedStatus === 'aguardando' && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleActivateInKitchen}
                      className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#d3a809] to-[#b38b00] hover:from-[#e3b819] hover:to-[#c49800] text-neutral-950 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-[0.98]"
                    >
                      <Flame className="w-4 h-4 stroke-[2.5]" />
                      Ativar na Cozinha · {formatTableBadge(editTableNumber)}
                    </button>
                    <button
                      type="button"
                      onClick={handleDeliverFromModal}
                      className="w-full py-2 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-200 font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Entregar Direto
                    </button>
                  </div>
                )}

                {selectedStatus === 'em_producao' && (
                  <button
                    type="button"
                    onClick={handleDeliverFromModal}
                    className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-neutral-950 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    Marcar Entregue · {formatTableBadge(editTableNumber || selectedOrder.tableNumber)}
                  </button>
                )}

                {selectedStatus === 'entregue' && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-3">
                    <div className="text-xs text-neutral-300">
                      <span className="font-bold text-red-400 uppercase mr-1.5">Servido</span>
                      por <strong>{selectedOrder.deliveredBy}</strong>{' '}
                      {selectedOrder.tableNumber
                        ? `(${formatTableBadge(selectedOrder.tableNumber)})`
                        : ''}
                    </div>

                    <button
                      type="button"
                      onClick={() => onUnmarkDelivered(selectedOrder.id)}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-[11px] text-neutral-200 flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Estornar
                    </button>
                  </div>
                )}
              </div>

              {/* COLLAPSIBLE TRANSACTION HISTORY */}
              {selectedOrder.transactions && selectedOrder.transactions.length > 0 && (
                <div className="pt-2 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setShowOrderHistory((v) => !v)}
                    className="w-full flex items-center justify-between text-[11px] text-neutral-400 hover:text-white cursor-pointer py-1"
                  >
                    <span className="flex items-center gap-1.5 font-semibold">
                      <History className="w-3.5 h-3.5 text-[#d3a809]" />
                      Histórico do Pedido ({selectedOrder.transactions.length})
                    </span>
                    {showOrderHistory ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {showOrderHistory && (
                    <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {selectedOrder.transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="text-[11px] bg-white/[0.02] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-neutral-300"
                        >
                          <div className="flex items-center justify-between gap-2 text-[10px] text-neutral-400 font-mono">
                            <span className="text-[#d3a809] font-bold">
                              {tx.action} · {tx.actor}
                            </span>
                            <span>{tx.timestamp}</span>
                          </div>
                          <div className="mt-0.5 text-neutral-200">{tx.details}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
