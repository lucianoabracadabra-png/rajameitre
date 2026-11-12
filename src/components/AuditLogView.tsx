import React, { useState, useMemo } from 'react';
import { AuditLogEntry, EventConfig, GuestOrder } from '../types';
import {
  BarChart3,
  TrendingUp,
  Users,
  Utensils,
  Cake,
  Calendar,
  MapPin,
  User,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Phone,
} from 'lucide-react';
import { formatDateFullExtenso } from '../utils/formatters';

interface AuditLogViewProps {
  logs: AuditLogEntry[];
  events?: EventConfig[];
  orders?: GuestOrder[];
  onOpenGuestComanda: () => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  logs,
  events = [],
  orders = [],
  onOpenGuestComanda,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMaitre, setSelectedMaitre] = useState<string>('all');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [showTechnicalLogs, setShowTechnicalLogs] = useState(false);

  // Compute Event Analytics per Event
  const eventAnalyticsList = useMemo(() => {
    return events.map((evt) => {
      const evtOrders = orders.filter(
        (o) => o.eventId === evt.id || o.eventTitle === evt.title
      );

      // Identify which maître was in charge from audit logs (strictly FSOUZA, LAUGUSTO, or GILSON)
      const relatedLogs = logs.filter(
        (l) => l.details.includes(evt.title) || l.details.includes(evt.id)
      );
      const maitreAction = relatedLogs.find((l) => ['FSOUZA', 'LAUGUSTO', 'GILSON'].includes(l.author));
      const hash = evt.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const fallbackMaitre = (['FSOUZA', 'LAUGUSTO', 'GILSON'] as const)[hash % 3];
      const maitreInCharge = maitreAction?.author || fallbackMaitre;

      // Aggregate Main Dishes
      const dishCounts: Record<string, { count: number; dietary: string[] }> = {};
      const dessertCounts: Record<string, number> = {};
      const specialNotes: { guest: string; note: string; dish: string }[] = [];

      evtOrders.forEach((order) => {
        const dishName = order.mainDish?.name || 'Prato Principal';
        if (!dishCounts[dishName]) {
          dishCounts[dishName] = { count: 0, dietary: order.mainDish?.dietary || [] };
        }
        dishCounts[dishName].count += 1;

        if (order.dessert) {
          const dessertName = order.dessert.name;
          dessertCounts[dessertName] = (dessertCounts[dessertName] || 0) + 1;
        }

        if (order.notes && order.notes.trim()) {
          specialNotes.push({
            guest: order.guestName,
            note: order.notes.trim(),
            dish: dishName,
          });
        }
      });

      const totalIssued = evtOrders.length;
      const reservations = evt.totalReservations || Math.max(totalIssued, 1);
      const attendanceRate = Math.min(100, Math.round((totalIssued / reservations) * 100));

      const dishesBreakdown = Object.entries(dishCounts)
        .map(([name, data]) => ({ name, count: data.count, dietary: data.dietary }))
        .sort((a, b) => b.count - a.count);

      const dessertsBreakdown = Object.entries(dessertCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      return {
        event: evt,
        maitreInCharge,
        totalReservations: reservations,
        totalIssued,
        attendanceRate,
        dishesBreakdown,
        dessertsBreakdown,
        specialNotes,
      };
    });
  }, [events, orders, logs]);

  // Overall Global KPIs
  const globalKpis = useMemo(() => {
    const totalEvents = events.length;
    const totalComandas = orders.length;
    const totalReservations = events.reduce((acc, e) => acc + (e.totalReservations || 0), 0);
    const avgAttendance =
      totalReservations > 0 ? Math.round((totalComandas / totalReservations) * 100) : 100;
    const totalDesserts = orders.filter((o) => !!o.dessert).length;

    return {
      totalEvents,
      totalComandas,
      totalReservations,
      avgAttendance,
      totalDesserts,
    };
  }, [events, orders]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return eventAnalyticsList.filter((item) => {
      const matchesSearch =
        item.event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.maitreInCharge.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.event.coordinatorName &&
          item.event.coordinatorName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesMaitre =
        selectedMaitre === 'all' || item.maitreInCharge === selectedMaitre;

      return matchesSearch && matchesMaitre;
    });
  }, [eventAnalyticsList, searchTerm, selectedMaitre]);

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-7">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#d3a809] uppercase tracking-widest">
            <BarChart3 className="w-4 h-4" />
            <span>Inteligência Gastronômica & Planejamento de Negócios</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1 font-display">
            Histórico & Análise de Eventos
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            Dados consolidados de comparecimento, volume de pratos servidos e histórico por responsável para projeção de insumos e compras futuras.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={onOpenGuestComanda}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#d3a809]" />
            Ver Comanda Convidado
          </button>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-white/[0.08] space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Eventos</span>
            <Calendar className="w-4 h-4 text-[#d3a809]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-display">
            {globalKpis.totalEvents}
          </div>
          <div className="text-[11px] text-neutral-400">Cadastrados no hotel</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/[0.08] space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Comandas</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-display">
            {globalKpis.totalComandas}
          </div>
          <div className="text-[11px] text-neutral-400">Pessoas atendidas no total</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/[0.08] space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Adesão Média</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-300 font-display">
            {globalKpis.avgAttendance}%
          </div>
          <div className="text-[11px] text-neutral-400">Reservas vs. Comandas emitidas</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/[0.08] space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Pratos Servidos</span>
            <Utensils className="w-4 h-4 text-[#d3a809]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#d3a809] font-display">
            {globalKpis.totalComandas} <span className="text-xs font-normal text-neutral-400">mains</span>
          </div>
          <div className="text-[11px] text-neutral-400">
            {globalKpis.totalDesserts} sobremesas incluídas
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/40 p-4 rounded-2xl border border-white/[0.08]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mr-1">
            Maître:
          </span>
          <button
            type="button"
            onClick={() => setSelectedMaitre('all')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
              selectedMaitre === 'all'
                ? 'bg-[#d3a809] text-neutral-950 font-bold'
                : 'bg-white/[0.05] text-neutral-400 hover:text-white'
            }`}
          >
            Todos ({eventAnalyticsList.length})
          </button>
          {(['FSOUZA', 'LAUGUSTO', 'GILSON'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSelectedMaitre(m)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors cursor-pointer font-mono ${
                selectedMaitre === m
                  ? 'bg-[#d3a809] text-neutral-950 font-bold'
                  : 'bg-white/[0.05] text-neutral-400 hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por evento ou local..."
            className="w-full pl-8 pr-3 py-1.5 bg-black/50 border border-white/[0.1] rounded-lg text-xs text-white placeholder-neutral-500 outline-none focus:border-[#d3a809]"
          />
        </div>
      </div>

      {/* DETAILED BUSINESS INTELLIGENCE LIST */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center glass-card rounded-2xl border border-dashed border-white/[0.1] text-xs text-neutral-400">
            Nenhum evento registrado encontrado para este filtro.
          </div>
        ) : (
          filteredEvents.map((item) => {
            const isExpanded = expandedEventId === item.event.id;
            const dateExtenso = formatDateFullExtenso(item.event.date, 'pt');

            return (
              <div
                key={item.event.id}
                className="glass-panel rounded-2xl border border-white/[0.08] hover:border-[#d3a809]/30 transition-all overflow-hidden"
              >
                {/* CARD SUMMARY HEADER */}
                <div
                  onClick={() => setExpandedEventId(isExpanded ? null : item.event.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none bg-white/[0.01] hover:bg-white/[0.02]"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-[#d3a809] uppercase tracking-wider">
                        {item.event.title}
                      </span>
                      <span className="text-[10px] text-neutral-400 bg-white/[0.06] px-2 py-0.5 rounded font-mono">
                        {item.event.accessCode}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-300">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#d3a809]" />
                        <span>{item.event.location}</span>
                      </div>
                      <span className="text-neutral-600">·</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{dateExtenso}</span>
                      </div>
                      <span className="text-neutral-600">·</span>
                      <div className="flex items-center gap-1 font-mono text-[11px] text-[#d3a809]">
                        <User className="w-3.5 h-3.5" />
                        <span>Maître: {item.maitreInCharge}</span>
                      </div>
                    </div>
                  </div>

                  {/* ATTENDANCE & DISH STATS BADGES */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-neutral-300">
                        {item.totalIssued} / {item.totalReservations} pessoas
                      </div>
                      <div className="text-[11px] text-emerald-400 font-bold">
                        {item.attendanceRate}% de comparecimento
                      </div>
                    </div>

                    <div className="w-20 bg-neutral-800 rounded-full h-2 overflow-hidden border border-white/[0.1]">
                      <div
                        className="bg-emerald-400 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, item.attendanceRate)}%` }}
                      />
                    </div>

                    <button
                      type="button"
                      className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-neutral-400 hover:text-white"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* EXPANDED BREAKDOWN: DISHES, DESSERTS & SPECIAL NOTES */}
                {isExpanded && (
                  <div className="p-5 border-t border-white/[0.08] bg-black/40 space-y-5 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* PRATOS PRINCIPAIS DEMANDADOS */}
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-bold text-[#d3a809] uppercase tracking-wider flex items-center gap-1.5 font-display">
                          <Utensils className="w-3.5 h-3.5" />
                          Consumo de Pratos Principais ({item.totalIssued} totais)
                        </h4>
                        <div className="space-y-1.5">
                          {item.dishesBreakdown.length === 0 ? (
                            <p className="text-xs text-neutral-500 italic">Nenhum pedido registrado ainda.</p>
                          ) : (
                            item.dishesBreakdown.map((d) => {
                              const share =
                                item.totalIssued > 0
                                  ? Math.round((d.count / item.totalIssued) * 100)
                                  : 0;
                              return (
                                <div
                                  key={d.name}
                                  className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs"
                                >
                                  <span className="font-medium text-white">{d.name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[11px] text-neutral-400">
                                      {share}%
                                    </span>
                                    <span className="font-mono font-bold text-[#d3a809] bg-[#d3a809]/10 px-2 py-0.5 rounded">
                                      {d.count} und
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* SOBREMESAS DEMANDADAS */}
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-bold text-[#d3a809] uppercase tracking-wider flex items-center gap-1.5 font-display">
                          <Cake className="w-3.5 h-3.5" />
                          Consumo de Sobremesas ({item.dessertsBreakdown.reduce((a, b) => a + b.count, 0)} totais)
                        </h4>
                        <div className="space-y-1.5">
                          {item.dessertsBreakdown.length === 0 ? (
                            <p className="text-xs text-neutral-500 italic">Nenhuma sobremesa demandada.</p>
                          ) : (
                            item.dessertsBreakdown.map((dessert) => (
                              <div
                                key={dessert.name}
                                className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs"
                              >
                                <span className="font-medium text-white">{dessert.name}</span>
                                <span className="font-mono font-bold text-[#d3a809] bg-[#d3a809]/10 px-2 py-0.5 rounded">
                                  {dessert.count} und
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* RESTRIÇÕES ALIMENTARES E OBSERVAÇÕES ESPECIAIS */}
                    {item.specialNotes.length > 0 && (
                      <div className="pt-2 border-t border-white/[0.06] space-y-2">
                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Observações & Restrições Notificadas ({item.specialNotes.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {item.specialNotes.map((noteItem, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-neutral-200"
                            >
                              <strong className="text-amber-300">{noteItem.guest}</strong> ({noteItem.dish}):{' '}
                              <span className="italic">"{noteItem.note}"</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* SECONDARY SECTION: AUDITORIA OPERACIONAL / LOGS TÉCNICOS */}
      <div className="pt-6 border-t border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowTechnicalLogs(!showTechnicalLogs)}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 cursor-pointer font-medium"
          >
            {showTechnicalLogs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{showTechnicalLogs ? 'Ocultar' : 'Exibir'} Registro Cronológico de Auditoria Técnica ({logs.length} registros)</span>
          </button>
        </div>

        {showTechnicalLogs && (
          <div className="glass-panel rounded-2xl overflow-hidden border border-white/[0.08] animate-in fade-in duration-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.03] text-neutral-400 uppercase tracking-wider text-[10px] border-b border-white/[0.08]">
                  <tr>
                    <th className="py-2.5 px-4">Data & Hora</th>
                    <th className="py-2.5 px-4">Usuário</th>
                    <th className="py-2.5 px-4">Ação</th>
                    <th className="py-2.5 px-4">Registro Operacional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {logs.slice(0, 50).map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-4 font-mono text-neutral-400 whitespace-nowrap text-[11px]">
                        {log.timestamp}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-white text-[11px] bg-white/[0.06] px-1.5 py-0.5 rounded">
                          {log.author}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="text-[10px] uppercase font-bold text-[#d3a809] bg-[#d3a809]/10 px-1.5 py-0.5 rounded">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-neutral-300 font-light text-xs">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
