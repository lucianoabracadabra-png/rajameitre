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
} from 'lucide-react';
import {
  generateOrderCode,
  generateAuthHash,
  getCurrentTimeFormatted,
  getCurrentDateFormatted,
} from '../utils/formatters';

interface AdminKitchenViewProps {
  orders: GuestOrder[];
  eventConfig: EventConfig;
  onAddSimulatedOrder: (order: GuestOrder) => void;
  onViewReceipt: (order: GuestOrder) => void;
  onOpenGuestComanda: () => void;
}

export const AdminKitchenView: React.FC<AdminKitchenViewProps> = ({
  orders,
  eventConfig,
  onAddSimulatedOrder,
  onViewReceipt,
  onOpenGuestComanda,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Totalized production counts before delivery
  const productionSummary = useMemo(() => {
    const mainDishesMap: Record<string, { id: string; name: string; count: number; dietary: string[] }> = {};
    const dessertsMap: Record<string, { id: string; name: string; count: number; dietary: string[] }> = {};
    const specialNotes: { guest: string; note: string; dish: string }[] = [];

    // Initialize with all active dishes in event even if 0
    eventConfig.activeDishes.forEach((d) => {
      mainDishesMap[d.name] = { id: d.id, name: d.name, count: 0, dietary: d.dietary };
    });

    if (eventConfig.allowDessert) {
      eventConfig.activeDesserts.forEach((d) => {
        dessertsMap[d.name] = { id: d.id, name: d.name, count: 0, dietary: d.dietary };
      });
    }

    // Accumulate registered orders
    orders.forEach((order) => {
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
      totalMains: orders.length,
      totalDesserts: orders.filter((o) => !!o.dessert).length,
      specialNotes,
    };
  }, [orders, eventConfig]);

  // Filtered orders for registration audit table
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      return (
        order.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.mainDish.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [orders, searchTerm]);

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
      eventConfig.activeDishes[Math.floor(Math.random() * eventConfig.activeDishes.length)] ||
      eventConfig.activeDishes[0];
    const randomDessert =
      eventConfig.allowDessert && eventConfig.activeDesserts.length > 0
        ? eventConfig.activeDesserts[Math.floor(Math.random() * eventConfig.activeDesserts.length)]
        : undefined;

    const newSimOrder: GuestOrder = {
      id: `ord-sim-${Date.now()}`,
      code: generateOrderCode(),
      guestName: randomName,
      pinUsed: eventConfig.accessCode,
      eventTitle: eventConfig.title,
      eventDate: getCurrentDateFormatted(),
      eventLocation: eventConfig.location,
      mainDish: randomDish,
      dessert: randomDessert,
      beverageNotice: '01 Bebida Não Alcoólica Inclusa (Cortesia BH Raja)',
      notes: Math.random() > 0.6 ? 'Ponto da carne ao ponto para mal.' : undefined,
      totalCost: 0,
      createdAt: getCurrentTimeFormatted(),
      authCode: generateAuthHash(randomName, eventConfig.title),
    };

    onAddSimulatedOrder(newSimOrder);
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#d3a809] uppercase tracking-widest">
            <Sparkles className="w-4 h-4" />
            <span>BH Raja Hotel · Logística & Pré-Produção</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-1 font-display">
            Mapa de Produção da Cozinha
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 mt-1.5">
            <span className="text-white font-medium">{eventConfig.title}</span>
            <span>·</span>
            <span className="flex items-center gap-1 text-[#d3a809]">
              <MapPin className="w-3.5 h-3.5" />
              {eventConfig.location}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {eventConfig.date} ({eventConfig.time})
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenGuestComanda}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#d3a809] to-[#b38b00] hover:from-[#e3b819] hover:to-[#c49800] text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-lg shadow-md cursor-pointer transition-all active:scale-95"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir Comanda do Convidado
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#d3a809]" />
            Imprimir Mapa de Produção
          </button>

          <button
            onClick={handleCreateMockOrder}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-neutral-300 text-xs rounded-lg transition-colors cursor-pointer"
            title="Adicionar pedido simulado para teste"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#d3a809]" />
            + Teste
          </button>
        </div>
      </div>

      {/* 1. MAPA DE PRODUÇÃO ANTECIPADA (CORE DELIVERABLE FOR THE CHEF) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-display">
              <Utensils className="w-5 h-5 text-[#d3a809]" />
              Totais para Produção Prévia (Antes da Entrega)
            </h2>
            <p className="text-xs text-neutral-400">
              Quantidades exatas apuradas para a brigada de cozinha preparar antes do início do almoço.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#d3a809]/10 border border-[#d3a809]/20 px-3.5 py-1.5 rounded-lg text-xs">
            <Users className="w-4 h-4 text-[#d3a809]" />
            <span className="text-neutral-300">Total de Convidados:</span>
            <strong className="text-white font-mono text-sm">{orders.length}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Dishes Batch Quantities */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  Pratos Principais a Preparar
                </h3>
                <span className="text-[11px] text-neutral-400">
                  Total de porções: {productionSummary.totalMains}
                </span>
              </div>
              <span className="text-xs font-mono text-[#d3a809] font-bold">
                100% dos pedidos
              </span>
            </div>

            <div className="space-y-3">
              {productionSummary.mainDishes.map((dish) => {
                const percentage =
                  productionSummary.totalMains > 0
                    ? Math.round((dish.count / productionSummary.totalMains) * 100)
                    : 0;

                return (
                  <div
                    key={dish.id}
                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-2 hover:border-[#d3a809]/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="font-medium text-sm text-neutral-100 flex-1">
                        {dish.name}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-neutral-400 font-mono">
                          {percentage}%
                        </span>
                        <span className="min-w-[54px] text-center font-mono font-bold text-lg text-neutral-950 bg-gradient-to-r from-[#d3a809] to-[#f0c430] px-3 py-0.5 rounded-lg shadow-sm">
                          {dish.count} un
                        </span>
                      </div>
                    </div>

                    {/* Visual proportion line */}
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
          <div className="glass-panel p-6 rounded-2xl space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div>
                  <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                    <Cake className="w-4 h-4 text-[#d3a809]" />
                    Sobremesas a Preparar
                  </h3>
                  <span className="text-[11px] text-neutral-400">
                    {eventConfig.allowDessert
                      ? `Total de sobremesas: ${productionSummary.totalDesserts}`
                      : 'Evento sem sobremesa configurada (apenas café)'}
                  </span>
                </div>
                {eventConfig.allowDessert && (
                  <span className="text-xs font-mono text-[#d3a809] font-bold">
                    {productionSummary.totalDesserts} porções
                  </span>
                )}
              </div>

              {!eventConfig.allowDessert ? (
                <div className="text-center py-10 text-xs text-neutral-400 italic">
                  Sobremesa desativada nos parâmetros deste evento.
                </div>
              ) : (
                <div className="space-y-3">
                  {productionSummary.desserts.map((dessert) => {
                    const percentage =
                      productionSummary.totalDesserts > 0
                        ? Math.round((dessert.count / productionSummary.totalDesserts) * 100)
                        : 0;

                    return (
                      <div
                        key={dessert.id}
                        className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-2 hover:border-[#d3a809]/30 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="font-medium text-sm text-neutral-100 flex-1">
                            {dessert.name}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs text-neutral-400 font-mono">
                              {percentage}%
                            </span>
                            <span className="min-w-[54px] text-center font-mono font-bold text-lg text-neutral-950 bg-gradient-to-r from-[#d3a809] to-[#f0c430] px-3 py-0.5 rounded-lg shadow-sm">
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
              <div className="mt-4 pt-4 border-t border-white/[0.08] space-y-2">
                <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Observações e Restrições dos Convidados ({productionSummary.specialNotes.length})
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
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

      {/* 2. REGISTRO GERAL DE COMANDAS DOS CONVIDADOS (PARA CONFERÊNCIA E AUDITORIA) */}
      <section className="space-y-4 pt-4 border-t border-white/[0.08]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-display">
              <ClipboardList className="w-4 h-4 text-[#d3a809]" />
              Registro Nominal de Comandas (Conferência do Maître)
            </h2>
            <p className="text-xs text-neutral-400">
              Lista para conferência na recepção do evento e checagem de presença.
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por convidado ou comanda..."
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
                  <th className="py-3 px-4">Hora</th>
                  <th className="py-3 px-4">Comanda</th>
                  <th className="py-3 px-4">Convidado</th>
                  <th className="py-3 px-4">Prato Principal</th>
                  {eventConfig.allowDessert && <th className="py-3 px-4">Sobremesa</th>}
                  <th className="py-3 px-4">Observações</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={eventConfig.allowDessert ? 7 : 6}
                      className="py-8 text-center text-neutral-500 italic"
                    >
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-white/[0.02] transition-colors text-neutral-200"
                    >
                      <td className="py-3 px-4 font-mono text-neutral-400">
                        {order.createdAt}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#d3a809]">
                        {order.code}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {order.guestName}
                      </td>
                      <td className="py-3 px-4">
                        {order.mainDish.name}
                      </td>
                      {eventConfig.allowDessert && (
                        <td className="py-3 px-4 text-neutral-300">
                          {order.dessert ? order.dessert.name : '—'}
                        </td>
                      )}
                      <td className="py-3 px-4 text-neutral-400 italic max-w-xs truncate">
                        {order.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onViewReceipt(order)}
                          className="text-[#d3a809] hover:underline text-[11px] font-medium cursor-pointer"
                        >
                          Ver Cupom
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
