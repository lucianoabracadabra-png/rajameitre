import React, { useState } from 'react';
import { EventConfig, GuestOrder } from '../types';
import { HOTEL_INFO } from '../data/menuDatabase';
import { formatDateFullExtenso, formatTimeRangeExtenso } from '../utils/formatters';
import { Printer, Copy, Check, X, Utensils, Calendar, Clock, MapPin, User, Phone, Users } from 'lucide-react';

interface PrintProductionModalProps {
  open: boolean;
  onClose: () => void;
  eventConfig: EventConfig;
  orders: GuestOrder[];
  productionSummary: {
    mainDishes: { id: string; name: string; count: number; dietary: string[] }[];
    desserts: { id: string; name: string; count: number; dietary: string[] }[];
    totalMains: number;
    totalDesserts: number;
    specialNotes: { guest: string; note: string; dish: string }[];
  };
}

export const PrintProductionModal: React.FC<PrintProductionModalProps> = ({
  open,
  onClose,
  eventConfig,
  orders,
  productionSummary,
}) => {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const dateExtenso = formatDateFullExtenso(eventConfig.date, 'pt');
  const timeExtenso = formatTimeRangeExtenso(eventConfig.timeStart || '11:30', eventConfig.timeEnd || '14:30', 'pt');
  const issued = orders.length;
  const totalReservations = eventConfig.totalReservations || issued;
  const percent = Math.min(100, Math.round((issued / totalReservations) * 100));

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    let summaryText = `*${HOTEL_INFO.name.toUpperCase()} — MAPA DE PRODUÇÃO DA COZINHA*\n`;
    summaryText += `*Evento:* ${eventConfig.title}\n`;
    summaryText += `*Espaço:* ${eventConfig.location}\n`;
    summaryText += `*Data:* ${dateExtenso} (${timeExtenso})\n`;
    if (eventConfig.coordinatorName) {
      summaryText += `*Responsável:* ${eventConfig.coordinatorName} ${eventConfig.coordinatorPhone ? `(${eventConfig.coordinatorPhone})` : ''}\n`;
    }
    summaryText += `*Total Emitido:* ${issued} / ${totalReservations} reservas (${percent}%)\n\n`;

    summaryText += `*PRATOS PRINCIPAIS:*\n`;
    productionSummary.mainDishes.forEach((d) => {
      summaryText += `• ${d.name}: ${d.count} un\n`;
    });

    if (eventConfig.allowDessert && productionSummary.desserts.length > 0) {
      summaryText += `\n*SOBREMESAS:*\n`;
      productionSummary.desserts.forEach((d) => {
        summaryText += `• ${d.name}: ${d.count} un\n`;
      });
    }

    if (productionSummary.specialNotes.length > 0) {
      summaryText += `\n*RESTRIÇÕES E OBSERVAÇÕES NOMINAIS:*\n`;
      productionSummary.specialNotes.forEach((n) => {
        summaryText += `• ${n.guest} (${n.dish}): ${n.note}\n`;
      });
    }

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl my-auto bg-white text-neutral-900 rounded-2xl shadow-2xl p-6 sm:p-8 cursor-default space-y-6"
      >
        {/* Top Action Bar (hidden when printing) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-200 no-print">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wider uppercase text-neutral-900 font-display">
              Folha Oficial de Produção · BH Raja Hotel
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#d3a809] hover:bg-[#b89100] text-neutral-950 text-xs font-bold uppercase rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / PDF
            </button>

            <button
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-800 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar Resumo
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE BANQUET ORDER SHEET (CLEAN HOTEL BANQUET SPEC) */}
        <div className="space-y-6 text-neutral-900 font-sans">
          {/* Header */}
          <div className="border-b-2 border-neutral-900 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs uppercase tracking-widest text-neutral-500 font-bold">
                  {HOTEL_INFO.name} · ALTA HOSPITALIDADE & EVENTOS
                </span>
                <h1 className="text-2xl font-bold text-neutral-950 tracking-tight font-display mt-0.5">
                  {eventConfig.title}
                </h1>
                <p className="text-xs text-neutral-600 italic">
                  {eventConfig.subtitle}
                </p>
              </div>

              <div className="sm:text-right shrink-0 bg-neutral-100 p-2.5 rounded-lg border border-neutral-300">
                <div className="text-xl font-bold font-mono text-neutral-900">
                  {issued} / {totalReservations}
                </div>
                <div className="text-[10px] uppercase font-semibold text-neutral-600">
                  Comandas / Total Reservado ({percent}%)
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-xs text-neutral-700">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                <span><strong>Espaço:</strong> {eventConfig.location}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                <span>{dateExtenso}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-500" />
                <span>{timeExtenso}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-neutral-500" />
                <span>Senha: <strong>{eventConfig.accessCode}</strong></span>
              </div>
            </div>

            {(eventConfig.coordinatorName || eventConfig.coordinatorPhone) && (
              <div className="mt-2 text-xs text-neutral-800 bg-amber-50 border border-amber-200 p-2 rounded flex items-center gap-3">
                <span className="font-bold uppercase text-[11px] text-amber-900">Coordenação:</span>
                {eventConfig.coordinatorName && (
                  <span className="font-semibold">{eventConfig.coordinatorName}</span>
                )}
                {eventConfig.coordinatorPhone && (
                  <span className="font-mono text-neutral-700">{eventConfig.coordinatorPhone}</span>
                )}
              </div>
            )}
          </div>

          {/* Quantities Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Mains */}
            <div className="space-y-2">
              <h2 className="text-xs uppercase font-bold text-neutral-800 tracking-wider flex items-center gap-1.5 pb-1 border-b border-neutral-300">
                <Utensils className="w-3.5 h-3.5" />
                Pratos Principais a Preparar ({productionSummary.totalMains} un)
              </h2>
              <div className="divide-y divide-neutral-200 text-xs">
                {productionSummary.mainDishes.map((dish) => (
                  <div key={dish.id} className="py-2 flex items-center justify-between">
                    <span className="font-medium text-neutral-900 pr-2">{dish.name}</span>
                    <span className="font-mono font-bold text-sm bg-neutral-100 px-2.5 py-0.5 rounded border border-neutral-300 shrink-0">
                      {dish.count} un
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Desserts */}
            <div className="space-y-2">
              <h2 className="text-xs uppercase font-bold text-neutral-800 tracking-wider flex items-center gap-1.5 pb-1 border-b border-neutral-300">
                Sobremesas a Preparar ({productionSummary.totalDesserts} un)
              </h2>
              {!eventConfig.allowDessert ? (
                <div className="text-xs text-neutral-500 italic py-3">
                  Sobremesa desativada neste evento (apenas café).
                </div>
              ) : (
                <div className="divide-y divide-neutral-200 text-xs">
                  {productionSummary.desserts.map((dessert) => (
                    <div key={dessert.id} className="py-2 flex items-center justify-between">
                      <span className="font-medium text-neutral-900 pr-2">{dessert.name}</span>
                      <span className="font-mono font-bold text-sm bg-neutral-100 px-2.5 py-0.5 rounded border border-neutral-300 shrink-0">
                        {dessert.count} un
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Connected Restrictions & Special Notes Table */}
          {productionSummary.specialNotes.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-neutral-200">
              <h2 className="text-xs uppercase font-bold text-amber-900 tracking-wider pb-1">
                Restrições & Observações Nominais Conectadas aos Pratos ({productionSummary.specialNotes.length})
              </h2>
              <table className="w-full text-left text-xs border border-neutral-300">
                <thead className="bg-neutral-100 border-b border-neutral-300 text-[11px] uppercase font-bold text-neutral-700">
                  <tr>
                    <th className="p-2">Convidado(a)</th>
                    <th className="p-2">Prato Escolhido</th>
                    <th className="p-2">Restrição Declarada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {productionSummary.specialNotes.map((item, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50">
                      <td className="p-2 font-bold text-neutral-900">{item.guest}</td>
                      <td className="p-2 text-neutral-800">{item.dish}</td>
                      <td className="p-2 font-medium text-amber-950">{item.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer of the Banquet Order */}
          <div className="pt-3 border-t border-neutral-300 text-[10px] text-neutral-500 flex justify-between items-center">
            <span>BH Raja Hotel · Gestão Gastronômica GarçON</span>
            <span>Documento emitido para pré-produção do buffet</span>
          </div>
        </div>
      </div>
    </div>
  );
};
