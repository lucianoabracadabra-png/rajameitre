import React, { useState, useMemo } from 'react';
import { GuestOrder, EventConfig } from '../types';
import {
  Utensils,
  Cake,
  Users,
  Search,
  PlusCircle,
  Printer,
  ExternalLink,
  ClipboardList,
  Sparkles,
  MapPin,
  Clock,
  Calendar,
  AlertTriangle,
  Trash2,
  Phone,
  User,
  Layers,
  Copy,
  Check,
  QrCode,
} from 'lucide-react';
import {
  generateOrderCode,
  generateAuthHash,
  getCurrentTimeFormatted,
  getCurrentDateFormatted,
  formatDateFullExtenso,
  formatTimeRangeExtenso,
} from '../utils/formatters';
import { PrintProductionModal } from './PrintProductionModal';

interface AdminKitchenViewProps {
  events: EventConfig[];
  currentEventId: string;
  onSelectEvent: (eventId: string) => void;
  orders: GuestOrder[];
  onAddSimulatedOrder: (order: GuestOrder) => void;
  onDeleteOrder: (orderId: string) => void;
  onViewReceipt: (order: GuestOrder) => void;
  onOpenGuestComanda: () => void;
}

export const AdminKitchenView: React.FC<AdminKitchenViewProps> = ({
  events,
  currentEventId,
  onSelectEvent,
  orders,
  onAddSimulatedOrder,
  onDeleteOrder,
  onViewReceipt,
  onOpenGuestComanda,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const activeEvent = events.find((e) => e.id === currentEventId) || events[0];

  const dateExtenso = formatDateFullExtenso(activeEvent.date, 'pt');
  const timeExtenso = formatTimeRangeExtenso(activeEvent.timeStart || '11:30', activeEvent.timeEnd || '14:30', 'pt');

  // Filter orders for the active event
  const eventOrders = useMemo(() => {
    return orders.filter(
      (o) => o.eventId === activeEvent.id || o.eventTitle === activeEvent.title
    );
  }, [orders, activeEvent]);

  // Totalized production counts before delivery
  const productionSummary = useMemo(() => {
    const mainDishesMap: Record<string, { id: string; name: string; count: number; dietary: string[] }> = {};
    const dessertsMap: Record<string, { id: string; name: string; count: number; dietary: string[] }> = {};
    const specialNotes: { guest: string; note: string; dish: string }[] = [];

    activeEvent.activeDishes.forEach((d) => {
      mainDishesMap[d.name] = { id: d.id, name: d.name, count: 0, dietary: d.dietary };
    });

    if (activeEvent.allowDessert) {
      activeEvent.activeDesserts.forEach((d) => {
        dessertsMap[d.name] = { id: d.id, name: d.name, count: 0, dietary: d.dietary };
      });
    }

    eventOrders.forEach((order) => {
      const mainName = order.mainDish.name;
      if (!mainDishesMap[mainName]) {
        mainDishesMap[mainName] = { id: order.mainDish.id, name: mainName, count: 0, dietary: order.mainDish.dietary };
      }
      mainDishesMap[mainName].count += 1;

      if (order.dessert) {
        const dName = order.dessert.name;
        if (!dessertsMap[dName]) {
          dessertsMap[dName] = { id: order.dessert.id, name: dName, count: 0, dietary: order.dessert.dietary };
        }
        dessertsMap[dName].count += 1;
      }

      if (order.notes && order.notes.trim()) {
        specialNotes.push({
          guest: order.guestName,
          note: order.notes.trim(),
          dish: order.mainDish.name,
        });
      }
    });

    return {
      mainDishes: Object.values(mainDishesMap).sort((a, b) => b.count - a.count),
      desserts: Object.values(dessertsMap).sort((a, b) => b.count - a.count),
      totalMains: eventOrders.length,
      totalDesserts: eventOrders.filter((o) => !!o.dessert).length,
      specialNotes,
    };
  }, [eventOrders, activeEvent]);

  const filteredOrders = useMemo(() => {
    return eventOrders.filter((order) => {
      return (
        order.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.mainDish.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [eventOrders, searchTerm]);

  const handleDeleteWithConfirm = (order: GuestOrder) => {
    if (
      window.confirm(
        `Excluir a comanda ${order.code} de "${order.guestName}"? Esta ação recalculará o mapa da cozinha.`
      )
    ) {
      onDeleteOrder(order.id);
    }
  };

  const handleCopyGuestLink = () => {
    const slug = activeEvent.slug || activeEvent.id;
    const url = `${window.location.origin}${window.location.pathname}#/${slug}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // Quick simulation helper
  const handleCreateMockOrder = () => {
    const mockNames = [
      'Dra. Camila Nogueira',
      'Desembargador Fábio Resende',
      'Dra. Helena Antunes',
      'Dr. Eduardo Prado',
      'Dra. Vanessa Siqueira',
      'Conselheiro Otávio Neves',
    ];
    const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
    const randomDish =
      activeEvent.activeDishes[Math.floor(Math.random() * activeEvent.activeDishes.length)] ||
      activeEvent.activeDishes[0];
    const randomDessert =
      activeEvent.allowDessert && activeEvent.activeDesserts.length > 0
        ? activeEvent.activeDesserts[Math.floor(Math.random() * activeEvent.activeDesserts.length)]
        : undefined;

    const mockNotes = [
      'Ponto da carne ao ponto para mal.',
      'Sem glúten estrito.',
      'Sem lactose.',
      undefined,
    ];
    const randomNote = mockNotes[Math.floor(Math.random() * mockNotes.length)];

    const newSimOrder: GuestOrder = {
      id: `ord-sim-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      code: generateOrderCode(),
      eventId: activeEvent.id,
      guestName: randomName,
      pinUsed: activeEvent.accessCode,
      eventTitle: activeEvent.title,
      eventDate: getCurrentDateFormatted(),
      eventLocation: activeEvent.location,
      mainDish: randomDish,
      dessert: randomDessert,
      beverageNotice: '01 Bebida Não Alcoólica (01 und) Inclusa',
      notes: randomNote,
      totalCost: 0,
      createdAt: getCurrentTimeFormatted(),
      authCode: generateAuthHash(randomName, activeEvent.title),
    };

    onAddSimulatedOrder(newSimOrder);
  };

  const reservationsTotal = activeEvent.totalReservations || 1;
  const issuedCount = eventOrders.length;
  const reservationPercentage = Math.min(100, Math.round((issuedCount / reservationsTotal) * 100));

  return (
    <div className="w-full max-w-6xl mx-auto py-7 px-4 sm:px-6 space-y-6">
      {/* 0. MULTI-EVENT SELECTOR FOR MAÎTRE */}
      <div className="space-y-2 no-print">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#d3a809]" />
            Eventos Simultâneos ({events.length}/4)
          </span>
          <span className="text-[11px] text-neutral-400">
            Selecione para inspecionar
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {events.map((evt, idx) => {
            const isSelected = evt.id === activeEvent.id;
            const evtOrdersCount = orders.filter((o) => o.eventId === evt.id || o.eventTitle === evt.title).length;
            return (
              <button
                key={evt.id}
                type="button"
                onClick={() => onSelectEvent(evt.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#d3a809]/15 border-[#d3a809] shadow-md'
                    : 'bg-black/40 border-white/[0.08] hover:border-white/[0.2] hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] uppercase font-semibold text-[#d3a809]">
                  <span>Evento #{idx + 1}</span>
                  <span className="font-mono text-white bg-white/[0.1] px-1.5 py-0.2 rounded">
                    {evtOrdersCount} comandas
                  </span>
                </div>
                <div className="text-xs font-bold text-white truncate font-display mt-0.5">
                  {evt.title}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-1">
                  <MapPin className="w-3 h-3 text-[#d3a809]" />
                  <span className="truncate">{evt.location}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/[0.08] no-print">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#d3a809] uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>BH Raja Hotel · Mapa de Produção</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-display">
            {activeEvent.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-300">
            <span className="flex items-center gap-1 text-[#d3a809] font-medium">
              <MapPin className="w-3.5 h-3.5" />
              {activeEvent.location}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              {dateExtenso}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#d3a809]" />
              {timeExtenso}
            </span>
          </div>

          {/* Maître Only: Coordinator info */}
          {(activeEvent.coordinatorName || activeEvent.coordinatorPhone) && (
            <div className="flex items-center gap-2 text-xs text-neutral-300 pt-0.5">
              <span className="text-[10px] uppercase font-bold text-[#d3a809] tracking-wider">
                Responsável:
              </span>
              {activeEvent.coordinatorName && (
                <span className="font-semibold text-white">
                  {activeEvent.coordinatorName}
                </span>
              )}
              {activeEvent.coordinatorPhone && (
                <span className="font-mono text-neutral-400">
                  {activeEvent.coordinatorPhone}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Copy Direct QR/Guest Link */}
          <button
            onClick={handleCopyGuestLink}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
            title="Copiar link direto para este evento (QR Code)"
          >
            {linkCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Link Copiado!</span>
              </>
            ) : (
              <>
                <QrCode className="w-3.5 h-3.5 text-[#d3a809]" />
                <span>Link Convidado</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#d3a809] hover:bg-[#b89100] text-neutral-950 text-xs font-bold uppercase rounded-lg shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Mapa
          </button>

          <button
            onClick={handleCreateMockOrder}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-neutral-400 hover:text-white text-xs rounded-lg transition-colors cursor-pointer"
            title="Adicionar pedido simulado para teste"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            + Teste
          </button>
        </div>
      </div>

      {/* 1. MAPA DE PRODUÇÃO ANTECIPADA */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-display">
              <Utensils className="w-4 h-4 text-[#d3a809]" />
              Totais de Pré-Produção da Cozinha
            </h2>
            <p className="text-xs text-neutral-400">
              Quantidades exatas a preparar para o início do serviço.
            </p>
          </div>

          {/* TOTAL COMANDAS / TOTAL RESERVAS PROPORTION CARD */}
          <div className="flex items-center gap-3 bg-[#d3a809]/10 border border-[#d3a809]/30 px-3.5 py-1.5 rounded-xl text-xs">
            <Users className="w-4 h-4 text-[#d3a809]" />
            <div className="flex items-center gap-2">
              <span className="text-neutral-300">Comandas:</span>
              <span className="text-white font-mono font-bold text-sm">
                {issuedCount} / {activeEvent.totalReservations || issuedCount}
              </span>
              <span className="text-[#d3a809] font-mono text-xs font-semibold">
                ({reservationPercentage}%)
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-black/40 border border-white/[0.08] p-2.5 rounded-xl space-y-1.5 no-print">
          <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#d3a809] to-[#f3cb38] transition-all duration-500 rounded-full"
              style={{ width: `${reservationPercentage}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Main Dishes Batch Quantities */}
          <div className="glass-panel p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
              <h3 className="text-sm font-bold text-white font-display">
                Pratos Principais ({productionSummary.totalMains} un)
              </h3>
              <span className="text-xs font-mono text-[#d3a809] font-bold">
                100% dos pedidos
              </span>
            </div>

            <div className="space-y-2">
              {productionSummary.mainDishes.map((dish) => {
                const percentage =
                  productionSummary.totalMains > 0
                    ? Math.round((dish.count / productionSummary.totalMains) * 100)
                    : 0;

                return (
                  <div
                    key={dish.id}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-1.5 hover:border-[#d3a809]/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-xs sm:text-sm text-neutral-100 flex-1">
                        {dish.name}
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-[11px] text-neutral-400 font-mono">
                          {percentage}%
                        </span>
                        <span className="min-w-[50px] text-center font-mono font-bold text-base text-neutral-950 bg-[#d3a809] px-2.5 py-0.5 rounded-lg shadow-sm">
                          {dish.count} un
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#d3a809] transition-all duration-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desserts Batch Quantities */}
          <div className="glass-panel p-5 rounded-2xl space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
                <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                  <Cake className="w-4 h-4 text-[#d3a809]" />
                  Sobremesas ({productionSummary.totalDesserts} un)
                </h3>
              </div>

              {!activeEvent.allowDessert ? (
                <div className="text-center py-8 text-xs text-neutral-500 italic">
                  Sobremesa desativada neste evento.
                </div>
              ) : (
                <div className="space-y-2">
                  {productionSummary.desserts.map((dessert) => {
                    const percentage =
                      productionSummary.totalDesserts > 0
                        ? Math.round((dessert.count / productionSummary.totalDesserts) * 100)
                        : 0;

                    return (
                      <div
                        key={dessert.id}
                        className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-1.5 hover:border-[#d3a809]/30 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-xs sm:text-sm text-neutral-100 flex-1">
                            {dessert.name}
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="text-[11px] text-neutral-400 font-mono">
                              {percentage}%
                            </span>
                            <span className="min-w-[50px] text-center font-mono font-bold text-base text-neutral-950 bg-[#d3a809] px-2.5 py-0.5 rounded-lg shadow-sm">
                              {dessert.count} un
                            </span>
                          </div>
                        </div>

                        <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#d3a809] transition-all duration-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Special Dietary & Cooking Notes Alert */}
            {productionSummary.specialNotes.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/[0.08] space-y-1.5">
                <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Restrições e Observações ({productionSummary.specialNotes.length})
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                  {productionSummary.specialNotes.map((item, idx) => (
                    <div
                      key={idx}
                      className="text-xs bg-white/[0.03] p-2 rounded-lg border border-white/[0.06] text-neutral-300"
                    >
                      <strong className="text-white">{item.guest}</strong> ({item.dish}):{' '}
                      <span className="text-amber-200">{item.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. REGISTRO GERAL DE COMANDAS DOS CONVIDADOS */}
      <section className="space-y-3 pt-3 border-t border-white/[0.08] no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2 font-display">
              <ClipboardList className="w-4 h-4 text-[#d3a809]" />
              Conferência de Comandas do Maître
            </h2>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar convidado ou comanda..."
              className="w-full pl-8 pr-3 py-1.5 bg-black/40 border border-white/[0.1] rounded-lg text-xs text-white placeholder-neutral-500 outline-none focus:border-[#d3a809]"
            />
          </div>
        </div>

        {/* Audit Table */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/[0.08]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.03] text-neutral-400 uppercase tracking-wider text-[10px] border-b border-white/[0.08]">
                <tr>
                  <th className="py-2.5 px-4">Hora</th>
                  <th className="py-2.5 px-4">Comanda</th>
                  <th className="py-2.5 px-4">Convidado</th>
                  <th className="py-2.5 px-4">Prato Principal</th>
                  {activeEvent.allowDessert && <th className="py-2.5 px-4">Sobremesa</th>}
                  <th className="py-2.5 px-4">Observações</th>
                  <th className="py-2.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeEvent.allowDessert ? 7 : 6}
                      className="py-6 text-center text-neutral-500 italic"
                    >
                      Nenhuma comanda registrada para este evento.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-white/[0.02] transition-colors text-neutral-200"
                    >
                      <td className="py-2.5 px-4 font-mono text-neutral-400">
                        {order.createdAt}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-[#d3a809]">
                        {order.code}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-white">
                        {order.guestName}
                      </td>
                      <td className="py-2.5 px-4">
                        {order.mainDish.name}
                      </td>
                      {activeEvent.allowDessert && (
                        <td className="py-2.5 px-4 text-neutral-300">
                          {order.dessert ? order.dessert.name : '—'}
                        </td>
                      )}
                      <td className="py-2.5 px-4 text-neutral-300 italic max-w-xs truncate">
                        {order.notes || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <button
                            onClick={() => onViewReceipt(order)}
                            className="text-[#d3a809] hover:underline text-[11px] font-medium cursor-pointer"
                          >
                            Ver Cupom
                          </button>
                          <span className="text-neutral-600">·</span>
                          <button
                            onClick={() => handleDeleteWithConfirm(order)}
                            className="text-neutral-400 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Excluir comanda"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* MODAL PRINT PRODUCTION SHEET (GUARANTEED TO OPEN ON SCREEN) */}
      <PrintProductionModal
        open={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        eventConfig={activeEvent}
        orders={eventOrders}
        productionSummary={productionSummary}
      />
    </div>
  );
};
