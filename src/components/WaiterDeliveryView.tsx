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
  UserCheck,
  RotateCcw,
  ArrowUpDown,
  MapPin,
  Sparkles,
  Flame,
  Pencil,
  Save,
  Users,
  History,
  Hash,
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

type StatusFilter = 'all' | 'em_producao' | 'aguardando' | 'entregue';

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
  staffRole,
  initialScannedCode,
  onClearInitialScannedCode,
  onActivateAndUpdateOrder,
  onMarkDelivered,
  onUnmarkDelivered,
}) => {
  const [scopeAllEvents, setScopeAllEvents] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );

  // Modal editing state
  const [isEditingOrder, setIsEditingOrder] = useState(false);
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

  const normalizedStaffName = staffName.trim().toUpperCase() || 'GARÇOM';
  const activeEvent = events.find((e) => e.id === currentEventId) || events[0] || null;

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

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
      setModalAlert(null);
    }
  }, [selectedOrder?.id]);

  // Available dishes & desserts for editing (from the order's event + masterDatabase fallback)
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

  // Resolve scanned code or URL against all orders
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
        text: `Nenhuma comanda encontrada para o código "${token}".`,
      });
      return false;
    },
    [orders, events, onSelectEvent]
  );

  // Handle deep-link QR scan arriving from URL (#/garcom?order=CMD-XXXX)
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
      setCameraError(
        'Câmera não suportada neste navegador. Digite ou busque o código CMD abaixo.'
      );
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
                  text: `QR lido (${extractOrderIdentifier(code.data)}), mas a comanda não foi localizada.`,
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
      setCameraError(
        'Não foi possível acessar a câmera (verifique as permissões). Use a busca por código CMD abaixo.'
      );
    }
  };

  // Scope orders to selected event (or all active events)
  const scopedOrders = useMemo(() => {
    if (scopeAllEvents || !activeEvent) return orders;
    return orders.filter(
      (o) => o.eventId === activeEvent.id || o.eventTitle === activeEvent.title
    );
  }, [orders, scopeAllEvents, activeEvent]);

  // Global & Waiter Scoreboard (Total pratos e quantos faltam)
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

    const remaining = total - delivered;
    return { total, awaiting, inProduction, delivered, remaining };
  }, [scopedOrders]);

  // "Meus Pedidos em Detalhe" — orders assigned to the logged-in waiter (Em Produção first, then Entregues)
  const myOrders = useMemo(() => {
    return scopedOrders
      .filter((o) => (o.assignedWaiter || '').toUpperCase() === normalizedStaffName)
      .sort((a, b) => {
        const stA = resolveOrderStatus(a);
        const stB = resolveOrderStatus(b);
        const weight = (st: OrderStatus) => (st === 'em_producao' ? 0 : st === 'aguardando' ? 1 : 2);
        const diff = weight(stA) - weight(stB);
        if (diff !== 0) return diff;
        return a.guestName.localeCompare(b.guestName, 'pt-BR', { sensitivity: 'base' });
      });
  }, [scopedOrders, normalizedStaffName]);

  const myInProductionCount = useMemo(
    () => myOrders.filter((o) => resolveOrderStatus(o) === 'em_producao').length,
    [myOrders]
  );

  // "Todos os Pedidos do Salão" (filtered & alphabetically sorted)
  const allFilteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return [...scopedOrders]
      .filter((o) => {
        const st = resolveOrderStatus(o);
        if (statusFilter !== 'all' && st !== statusFilter) return false;
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
  }, [scopedOrders, statusFilter, searchTerm]);

  const handleQuickLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    openOrderByCode(searchTerm);
  };

  // Build updates payload from modal fields
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
        text: 'Informe o número da Mesa antes de ativar o pedido na cozinha.',
      });
      return;
    }

    const updated = onActivateAndUpdateOrder(selectedOrder.id, buildModalPayload(true));
    if (updated) {
      setIsEditingOrder(false);
      setModalAlert({
        type: 'success',
        text: `Pedido ativado na cozinha para ${formatTableBadge(updated.tableNumber)} (${updated.assignedWaiter}).`,
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
        text: 'Alterações registradas no pedido e no histórico.',
      });
    }
  };

  const handleDeliverFromModal = () => {
    if (!selectedOrder) return;
    // Save any pending edits or table number first if modified
    const currentStatus = resolveOrderStatus(selectedOrder);
    if (currentStatus === 'aguardando' && !editTableNumber.trim()) {
      setModalAlert({
        type: 'error',
        text: 'Defina o número da Mesa antes de marcar como entregue.',
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fade-in">
      {/* HEADER BAR + SCOREBOARD ("TOTAL DE PRATOS E QUANTOS FALTAM") */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/[0.08] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-[#d3a809]">
              <UserCheck className="w-3.5 h-3.5" />
              <span>
                {staffRole === 'waiter' ? 'Garçom em Serviço' : 'Painel de Salão · Maître'}
              </span>
              <span className="text-neutral-600">·</span>
              <span className="px-2 py-0.5 rounded bg-[#d3a809]/15 border border-[#d3a809]/30 text-[#f0cb40] font-mono">
                {normalizedStaffName}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-display">
              Ativação na Cozinha, Mesas & Entregas
            </h1>
          </div>

          {/* 4-Card KPI: Total de Pratos / Faltam / Em Produção / Entregues */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
            <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-center">
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">
                Total Pratos
              </div>
              <div className="text-lg font-bold font-mono text-white tabular-nums">
                {stats.total}
              </div>
            </div>

            <div className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/35 text-center">
              <div className="text-[10px] uppercase tracking-wider text-amber-300 font-bold">
                Faltam
              </div>
              <div className="text-lg font-bold font-mono text-amber-200 tabular-nums">
                {stats.remaining}
              </div>
            </div>

            <div className="px-3 py-2 rounded-xl bg-sky-500/15 border border-sky-500/30 text-center">
              <div className="text-[10px] uppercase tracking-wider text-sky-300">
                Em Produção
              </div>
              <div className="text-lg font-bold font-mono text-sky-200 tabular-nums">
                {stats.inProduction}
              </div>
            </div>

            <div className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-center">
              <div className="text-[10px] uppercase tracking-wider text-emerald-300">
                Entregues
              </div>
              <div className="text-lg font-bold font-mono text-emerald-200 tabular-nums">
                {stats.delivered}
              </div>
            </div>
          </div>
        </div>

        {/* Remaining Progress Bar */}
        {stats.total > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span>
                Progresso do Serviço: <strong className="text-white">{stats.delivered}</strong> de{' '}
                <strong className="text-white">{stats.total}</strong> pratos entregues
              </span>
              <span className="font-mono text-[#d3a809] font-semibold">
                {stats.remaining === 0
                  ? '100% servido!'
                  : `Faltam ${stats.remaining} (${stats.awaiting} aguardando mesa · ${stats.inProduction} em produção)`}
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#d3a809] to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${Math.round((stats.delivered / stats.total) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* EVENT SCOPE SELECTOR */}
      {events.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {events.map((evt, idx) => {
            const isSelected = !scopeAllEvents && activeEvent?.id === evt.id;
            return (
              <button
                key={evt.id}
                type="button"
                onClick={() => {
                  setScopeAllEvents(false);
                  onSelectEvent(evt.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#d3a809] text-neutral-950 font-bold border-[#d3a809] shadow-sm'
                    : 'bg-white/[0.04] text-neutral-300 border-white/[0.08] hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <span className="font-mono text-[10px] opacity-80">#{idx + 1}</span>
                <span className="truncate max-w-[180px]">{evt.title}</span>
              </button>
            );
          })}

          {events.length > 1 && (
            <button
              type="button"
              onClick={() => setScopeAllEvents((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                scopeAllEvents
                  ? 'bg-white text-neutral-950 font-bold border-white'
                  : 'bg-white/[0.04] text-neutral-300 border-white/[0.08] hover:bg-white/[0.08]'
              }`}
            >
              Todos Eventos ({orders.length})
            </button>
          )}
        </div>
      )}

      {/* QR SCANNER CTA & SEARCH / CODE LOOKUP */}
      <section className="glass-panel rounded-2xl p-4 sm:p-5 border border-[#d3a809]/25 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={scannerOpen ? stopScanner : startScanner}
            className={`px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-98 shrink-0 ${
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
                <QrCode className="w-4 h-4" />
                Escanear QR Code na Mesa
              </>
            )}
          </button>

          <form onSubmit={handleQuickLookupSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setScanFeedback(null);
                }}
                placeholder="Buscar convidado, mesa, garçom ou código (CMD-XXXX)..."
                className="w-full pl-9 pr-3 py-2.5 bg-black/50 border border-white/[0.1] focus:border-[#d3a809] rounded-xl text-xs text-white placeholder-neutral-500 outline-none transition-all"
              />
            </div>
            {searchTerm.trim().toUpperCase().startsWith('CMD-') && (
              <button
                type="submit"
                className="px-3.5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.12] text-xs font-semibold text-white cursor-pointer shrink-0"
              >
                Abrir
              </button>
            )}
          </form>
        </div>

        {/* LIVE CAMERA SCANNER PANEL */}
        {scannerOpen && (
          <div className="rounded-xl bg-black/70 border border-[#d3a809]/30 p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#d3a809] font-semibold flex items-center gap-1.5">
                <Camera className="w-4 h-4" />
                Aponte para o QR Code do cupom para definir a mesa e ativar na cozinha
              </span>
              <button
                type="button"
                onClick={stopScanner}
                className="text-neutral-400 hover:text-white p-1 rounded cursor-pointer"
                title="Fechar leitor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cameraError ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            ) : (
              <div className="relative w-full max-w-sm mx-auto aspect-square rounded-xl overflow-hidden bg-black border border-white/10">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-52 h-52 relative">
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
          <div className="flex items-center justify-between gap-2 text-xs text-rose-200 bg-rose-500/10 border border-rose-500/25 px-3.5 py-2.5 rounded-xl">
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
      </section>

      {/* SECTION 1: MEUS PEDIDOS EM DETALHE */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#d3a809]" />
            <h2 className="text-base font-bold text-white font-display">
              Meus Pedidos em Detalhe ({normalizedStaffName})
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bold">
              {myInProductionCount} em produção
            </span>
          </div>
          <span className="text-[11px] text-neutral-400">
            Pedidos que você ativou na mesa para entregar
          </span>
        </div>

        {myOrders.length === 0 ? (
          <div className="glass-panel rounded-2xl p-5 border border-dashed border-white/[0.12] text-xs text-neutral-400 flex items-center gap-3">
            <QrCode className="w-5 h-5 text-[#d3a809] shrink-0" />
            <span>
              Você ainda não ativou nenhum pedido na mesa. Escaneie o QR Code de um convidado ou
              abra uma comanda abaixo para definir a mesa e ativar na cozinha.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {myOrders.map((order) => {
              const st = resolveOrderStatus(order);
              const isDelivered = st === 'entregue';
              const isProd = st === 'em_producao';

              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                    isProd
                      ? 'bg-[#09122e] border-sky-400/40 hover:border-[#d3a809] shadow-lg'
                      : isDelivered
                      ? 'bg-white/[0.02] border-emerald-500/25 opacity-85 hover:opacity-100'
                      : 'glass-card border-white/[0.1]'
                  }`}
                >
                  {/* Top Row: Mesa + Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-[#d3a809] text-neutral-950 font-mono text-xs font-black tracking-wide">
                        {formatTableBadge(order.tableNumber)}
                      </span>
                      <span className="font-mono text-xs font-bold text-[#d3a809]">
                        {order.code}
                      </span>
                      {order.activatedAt && (
                        <span className="text-[10px] text-neutral-400 font-mono">
                          Ativado {order.activatedAt}
                        </span>
                      )}
                    </div>

                    {isDelivered ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/40 text-red-400 text-[10px] font-black uppercase tracking-widest">
                        <CheckCircle2 className="w-3 h-3" />
                        Entregue
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-200 text-[10px] font-bold uppercase tracking-wider">
                        <Flame className="w-3 h-3 text-sky-300" />
                        Em Produção
                      </span>
                    )}
                  </div>

                  {/* Guest Name */}
                  <div>
                    <h3 className="text-lg font-bold text-white uppercase font-display tracking-tight">
                      {order.guestName}
                    </h3>
                  </div>

                  {/* Full Dish + Dessert + Beverage + Notes Breakdown */}
                  <div className="p-3 rounded-xl bg-black/35 border border-white/[0.07] space-y-2 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-white font-semibold">
                        <Utensils className="w-3.5 h-3.5 text-[#d3a809] shrink-0" />
                        <span>{order.mainDish.name}</span>
                      </div>
                      {order.mainDish.dietary && order.mainDish.dietary.length > 0 && (
                        <div className="pl-5">
                          <DietaryIcons tags={order.mainDish.dietary} />
                        </div>
                      )}
                    </div>

                    {order.dessert && (
                      <div className="flex items-center gap-1.5 text-neutral-200 pt-1 border-t border-white/[0.05]">
                        <Cake className="w-3.5 h-3.5 text-[#d3a809]/80 shrink-0" />
                        <span>{order.dessert.name}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-neutral-400 pt-1 border-t border-white/[0.05]">
                      <GlassWater className="w-3.5 h-3.5 text-[#d3a809]/70 shrink-0" />
                      <span>01 Bebida Não Alcoólica (01 und)</span>
                    </div>

                    {order.notes && (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-200 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>Obs:</strong> {order.notes}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Direct Quick Actions */}
                  <div
                    className="flex items-center justify-between gap-2 pt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedOrderId(order.id)}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-[11px] text-neutral-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3 text-[#d3a809]" />
                      Editar / Ver Ficha
                    </button>

                    {isProd && (
                      <button
                        type="button"
                        onClick={() => onMarkDelivered(order.id)}
                        className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        Entregar na {formatTableBadge(order.tableNumber)}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 2: TODOS OS PEDIDOS DO SALÃO (APOIO ENTRE GARÇONS COM TAG DO NOME) */}
      <section className="space-y-3 pt-4 border-t border-white/[0.08]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#d3a809]" />
            <h2 className="text-base font-bold text-white font-display">
              Todos os Pedidos do Salão (Apoio entre Garçons)
            </h2>
            <span className="text-[11px] text-neutral-400 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-[#d3a809]" />
              A–Z
            </span>
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.08] self-start sm:self-auto">
            {(
              [
                { key: 'all', label: `Todos (${stats.total})` },
                { key: 'em_producao', label: `Em Produção (${stats.inProduction})` },
                { key: 'aguardando', label: `Aguardando (${stats.awaiting})` },
                { key: 'entregue', label: `Entregues (${stats.delivered})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  statusFilter === tab.key
                    ? 'bg-[#d3a809] text-neutral-950 font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {allFilteredOrders.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center text-xs text-neutral-400 border border-white/[0.08]">
            Nenhum pedido encontrado com os filtros atuais.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allFilteredOrders.map((order) => {
              const st = resolveOrderStatus(order);
              const isDelivered = st === 'entregue';
              const isProd = st === 'em_producao';
              const ownerWaiter = order.assignedWaiter;
              const isOtherWaiter =
                !!ownerWaiter && ownerWaiter.toUpperCase() !== normalizedStaffName;

              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedOrderId(order.id);
                  }}
                  className={`text-left p-4 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden active:scale-[0.99] ${
                    isDelivered
                      ? 'bg-white/[0.02] border-emerald-500/25 hover:border-emerald-400/40'
                      : isProd
                      ? 'bg-[#09122e]/80 border-sky-500/30 hover:border-[#d3a809]/60'
                      : 'glass-card border-white/[0.1] hover:border-[#d3a809]/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-[#d3a809]">
                          {order.code}
                        </span>

                        {order.tableNumber && (
                          <span className="px-1.5 py-0.5 rounded bg-[#d3a809]/20 border border-[#d3a809]/35 text-[#f0cb40] font-mono text-[10px] font-bold">
                            {formatTableBadge(order.tableNumber)}
                          </span>
                        )}

                        {/* Waiter Collaboration Tag */}
                        {ownerWaiter ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                              isOtherWaiter
                                ? 'bg-violet-500/15 border-violet-400/35 text-violet-200'
                                : 'bg-[#d3a809]/20 border-[#d3a809]/40 text-[#f0cb40]'
                            }`}
                          >
                            Garçom: {ownerWaiter}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.05] border border-white/[0.08] text-neutral-400">
                            Sem garçom
                          </span>
                        )}

                        {scopeAllEvents && (
                          <span className="text-[10px] text-neutral-400 truncate max-w-[140px]">
                            · {order.eventTitle}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-white uppercase tracking-tight truncate group-hover:text-[#f0cb40] transition-colors">
                        {order.guestName}
                      </h3>
                    </div>

                    {/* Status Badge */}
                    {isDelivered ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/40 text-red-400 text-[10px] font-black uppercase tracking-widest shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        Entregue
                      </span>
                    ) : isProd ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/20 border border-sky-400/35 text-sky-200 text-[10px] font-bold uppercase tracking-wider shrink-0">
                        <Flame className="w-3 h-3" />
                        Em Produção
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider shrink-0">
                        <Clock className="w-3 h-3" />
                        Aguardando Mesa
                      </span>
                    )}
                  </div>

                  {/* Dish & Dessert Preview */}
                  <div className="mt-3 pt-2.5 border-t border-white/[0.06] space-y-1 text-xs">
                    <div className="text-neutral-200 font-medium flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5 text-[#d3a809] shrink-0" />
                      <span className="truncate">{order.mainDish.name}</span>
                    </div>
                    {order.dessert && (
                      <div className="text-neutral-400 flex items-center gap-1.5">
                        <Cake className="w-3.5 h-3.5 text-[#d3a809]/70 shrink-0" />
                        <span className="truncate">{order.dessert.name}</span>
                      </div>
                    )}
                    {order.notes && (
                      <div className="text-amber-300 text-[11px] flex items-center gap-1.5 pt-0.5">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span className="truncate">{order.notes}</span>
                      </div>
                    )}
                  </div>

                  {isProd && (
                    <div
                      className="mt-3 pt-2 border-t border-white/[0.06] flex justify-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => onMarkDelivered(order.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 hover:text-neutral-950 border border-emerald-500/40 text-emerald-200 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
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
      </section>

      {/* INTERNAL WAITER ORDER VIEW MODAL (QR ACTIVATION, TABLE ASSIGNMENT, EDITING & RED STAMP) */}
      {selectedOrder && (
        <div
          onClick={() => setSelectedOrderId(null)}
          className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 cursor-pointer no-print overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Pedido Interno do Garçom"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl my-auto rounded-2xl bg-[#070a1f] border border-[#d3a809]/35 shadow-2xl overflow-hidden cursor-default relative max-h-[92vh] flex flex-col"
          >
            {/* RED RUBBER STAMP ("ENTREGUE") WHEN ALREADY SERVED */}
            {selectedStatus === 'entregue' && (
              <div
                aria-label="Pedido Entregue"
                className="pointer-events-none select-none absolute top-14 right-5 sm:right-8 z-20 -rotate-12 transform transition-all duration-300"
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
            <div className="px-5 py-4 bg-white/[0.03] border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-[#d3a809]">
                  <Sparkles className="w-3.5 h-3.5" />
                  Sistema Interno · Garçom & Cozinha
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="font-mono text-sm font-bold text-white">
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
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingOrder((v) => !v);
                    setModalAlert(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                    isEditingOrder
                      ? 'bg-[#d3a809] text-neutral-950 border-[#d3a809]'
                      : 'bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 border-white/[0.1]'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {isEditingOrder ? 'Fechar Edição' : 'Editar Pedido'}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOrderId(null)}
                  className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 space-y-5 relative z-10 overflow-y-auto">
              {/* Guest Identity & Event */}
              <div className="space-y-1 pr-24">
                <div className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">
                  Convidado(a)
                </div>
                <h2 className="text-2xl font-bold text-white uppercase font-display tracking-tight leading-tight">
                  {selectedOrder.guestName}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 pt-1">
                  <span className="flex items-center gap-1 text-[#d3a809]">
                    <MapPin className="w-3.5 h-3.5" />
                    {selectedOrder.eventLocation}
                  </span>
                  <span>·</span>
                  <span>{selectedOrder.eventTitle}</span>
                  {selectedOrder.assignedWaiter && (
                    <>
                      <span>·</span>
                      <span className="text-sky-300 font-mono font-bold">
                        Garçom: {selectedOrder.assignedWaiter}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* TABLE ASSIGNMENT BOX (ALWAYS EASY TO TYPE ON QR SCAN) */}
              <div className="p-3.5 rounded-xl bg-[#d3a809]/10 border border-[#d3a809]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#d3a809] flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" />
                    Mesa do Convidado
                  </label>
                  <p className="text-[11px] text-neutral-300">
                    Defina a mesa para ativar na cozinha e localizar na entrega.
                  </p>
                </div>

                <input
                  type="text"
                  value={editTableNumber}
                  onChange={(e) => {
                    setEditTableNumber(e.target.value);
                    setModalAlert(null);
                  }}
                  placeholder="Ex: 12"
                  className="w-full sm:w-32 px-3 py-2 bg-black/60 border border-[#d3a809]/50 focus:border-[#f0cb40] rounded-xl text-sm font-mono font-bold text-white text-center placeholder-neutral-500 outline-none"
                />
              </div>

              {/* FULL INLINE ORDER EDITOR (WHEN "EDITAR PEDIDO" IS OPEN) */}
              {isEditingOrder ? (
                <div className="p-4 rounded-xl bg-white/[0.04] border border-[#d3a809]/35 space-y-3.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#d3a809]">
                    Editar Qualquer Dado do Pedido (Auditoria Registrada)
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-neutral-300 font-semibold">
                        Nome do Convidado
                      </label>
                      <input
                        type="text"
                        value={editGuestName}
                        onChange={(e) => setEditGuestName(e.target.value)}
                        className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-xs text-white outline-none focus:border-[#d3a809]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-neutral-300 font-semibold">
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
                    <label className="text-[11px] text-neutral-300 font-semibold">
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
                    <label className="text-[11px] text-neutral-300 font-semibold">
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
                    <label className="text-[11px] text-neutral-300 font-semibold">
                      Observações / Restrições Especiais
                    </label>
                    <textarea
                      rows={2}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Ex: Ponto da carne bem passado, sem lactose..."
                      className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-xs text-white outline-none focus:border-[#d3a809]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingOrder(false)}
                      className="px-3.5 py-2 rounded-xl text-xs text-neutral-300 hover:bg-white/[0.06] cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveOrderEdits}
                      className="px-4 py-2 rounded-xl bg-[#d3a809] hover:bg-[#e3b819] text-neutral-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              ) : (
                /* READ-ONLY ORDER SUMMARY */
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#d3a809] flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5" />
                      Prato Principal
                    </div>
                    <div className="text-base font-bold text-white font-display">
                      {selectedOrder.mainDish.name}
                    </div>
                    {selectedOrder.mainDish.dietary && selectedOrder.mainDish.dietary.length > 0 && (
                      <div className="pt-1">
                        <DietaryIcons tags={selectedOrder.mainDish.dietary} />
                      </div>
                    )}
                  </div>

                  {selectedOrder.dessert && (
                    <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#d3a809] flex items-center gap-1.5">
                        <Cake className="w-3.5 h-3.5" />
                        Sobremesa
                      </div>
                      <div className="text-base font-bold text-white font-display">
                        {selectedOrder.dessert.name}
                      </div>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5 text-xs text-neutral-300">
                    <GlassWater className="w-4 h-4 text-[#d3a809] shrink-0" />
                    <span>01 Bebida Não Alcoólica (01 und) Inclusa</span>
                  </div>

                  {selectedOrder.notes && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Observação / Restrição do Convidado
                      </div>
                      <p className="text-xs text-amber-100 font-medium leading-relaxed">
                        {selectedOrder.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* MODAL ALERT FEEDBACK */}
              {modalAlert && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
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
              <div className="pt-3 border-t border-white/[0.08] space-y-2.5">
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
                  <>
                    <button
                      type="button"
                      onClick={handleActivateInKitchen}
                      className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#d3a809] to-[#b38b00] hover:from-[#e3b819] hover:to-[#c49800] text-neutral-950 font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-[0.98]"
                    >
                      <Flame className="w-4 h-4 stroke-[2.5]" />
                      Ativar Pedido na Cozinha (Em Produção)
                    </button>
                    <button
                      type="button"
                      onClick={handleDeliverFromModal}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-200 font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Já Entregue Direto na Mesa
                    </button>
                  </>
                )}

                {selectedStatus === 'em_producao' && (
                  <button
                    type="button"
                    onClick={handleDeliverFromModal}
                    className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-neutral-950 font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    Marcar como Entregue na{' '}
                    {formatTableBadge(editTableNumber || selectedOrder.tableNumber)}
                  </button>
                )}

                {selectedStatus === 'entregue' && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-3">
                    <div className="text-xs text-red-200 space-y-0.5">
                      <div className="font-bold text-red-400 uppercase tracking-wider">
                        Pedido já foi servido
                      </div>
                      <div className="text-[11px] text-neutral-300">
                        Baixa realizada por <strong>{selectedOrder.deliveredBy}</strong>{' '}
                        {selectedOrder.tableNumber
                          ? `na ${formatTableBadge(selectedOrder.tableNumber)} `
                          : ''}
                        {selectedOrder.deliveredAt ? `em ${selectedOrder.deliveredAt}` : ''}.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onUnmarkDelivered(selectedOrder.id)}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-[11px] text-neutral-300 hover:text-white flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                      title="Desfazer marcação de entrega"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Estornar
                    </button>
                  </div>
                )}
              </div>

              {/* ORDER TRANSACTION HISTORY TRAIL */}
              {selectedOrder.transactions && selectedOrder.transactions.length > 0 && (
                <div className="pt-3 border-t border-white/[0.08] space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <History className="w-3 h-3 text-[#d3a809]" />
                    Transações & Alterações deste Pedido ({selectedOrder.transactions.length})
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
