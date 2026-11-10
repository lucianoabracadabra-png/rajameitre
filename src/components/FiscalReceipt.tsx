import React, { useRef } from 'react';
import { GuestOrder, EventConfig } from '../types';
import { HOTEL_INFO } from '../data/menuDatabase';
import { Printer, Check, Copy, Sparkles, Utensils, RotateCcw, X } from 'lucide-react';

interface FiscalReceiptProps {
  order: GuestOrder;
  eventConfig: EventConfig;
  onReset: () => void;
  onClose?: () => void;
}

export const FiscalReceipt: React.FC<FiscalReceiptProps> = ({
  order,
  eventConfig,
  onReset,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const handleClose = onClose || onReset;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(order.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center relative">
      {/* Top Banner */}
      <div className="w-full text-center mb-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d3a809]/10 border border-[#d3a809]/20 text-[#d3a809] text-xs tracking-wider uppercase mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Comanda Emitida
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight font-display">
          Sua Comanda de Evento
        </h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          Apresente este comprovante ao garçom quando solicitado.
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-5 no-print">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-white text-xs font-medium uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5 text-[#d3a809]" />
          Imprimir Cupom
        </button>

        <button
          onClick={handleCopyCode}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-neutral-300 text-xs font-medium uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Copiado!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-neutral-400" />
              Copiar ({order.code})
            </>
          )}
        </button>

        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#d3a809]/20 border border-[#d3a809]/30 text-[#d3a809] text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#d3a809]/30 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Novo Pedido
        </button>
      </div>

      {/* THE FISCAL CUPOM RECEIPT */}
      <div
        ref={receiptRef}
        className="w-full relative bg-[#fbf9f5] text-[#14151a] p-6 rounded shadow-2xl font-mono-receipt text-xs leading-relaxed border-t-4 border-dashed border-[#d3a809]"
      >
        {/* Small corner X button directly on the cupom */}
        {handleClose && (
          <button
            onClick={handleClose}
            className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-full hover:bg-neutral-200 text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer no-print"
            title="Fechar comanda"
            aria-label="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Header */}
        <div className="text-center pb-3 border-b border-dashed border-neutral-400">
          <div className="text-sm font-bold tracking-widest uppercase font-display text-neutral-900">
            {HOTEL_INFO.name}
          </div>
          <div className="text-[10px] text-neutral-600 mt-0.5">
            {HOTEL_INFO.tagline}
          </div>
          <div className="text-[10px] text-neutral-500">
            {HOTEL_INFO.address}
          </div>
          <div className="text-[10px] text-neutral-500">
            CNPJ: {HOTEL_INFO.cnpj}
          </div>
          <div className="mt-1.5 text-[10px] font-bold tracking-wider text-neutral-800 bg-neutral-200/80 py-0.5 px-2 rounded">
            COMPROVANTE DE COMANDA · BH RAJA
          </div>
        </div>

        {/* Order Details Matrix */}
        <div className="py-2.5 border-b border-dashed border-neutral-400 text-[11px] space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="text-neutral-500">COMANDA:</span>
            <span className="font-bold text-sm tracking-wider text-neutral-900">
              {order.code}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">CONVIDADO(A):</span>
            <span className="font-bold text-neutral-900 uppercase">
              {order.guestName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">EVENTO:</span>
            <span className="text-right font-medium text-neutral-800 max-w-[240px] truncate">
              {order.eventTitle}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">ESPAÇO:</span>
            <span className="text-neutral-800 font-semibold">{order.eventLocation}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">DATA & HORA:</span>
            <span className="text-neutral-800">
              {order.eventDate} às {order.createdAt}
            </span>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="py-2.5 border-b border-dashed border-neutral-400 space-y-2">
          <div className="flex justify-between text-[10px] font-bold text-neutral-500 uppercase tracking-wider pb-1 border-b border-neutral-200">
            <span>ITEM / ESPECIFICAÇÃO</span>
            <span>VALOR</span>
          </div>

          {/* Prato Principal */}
          <div className="py-1">
            <div className="flex justify-between items-start gap-2">
              <div className="font-bold text-neutral-900">
                01. [PRATO PRINCIPAL]
              </div>
              <div className="font-bold tabular-nums text-neutral-900">
                R$ 0,00
              </div>
            </div>
            <div className="text-[11px] font-semibold text-neutral-800 pl-3">
              {order.mainDish.name}
            </div>
          </div>

          {/* Sobremesa (se houver) */}
          {order.dessert && (
            <div className="py-1 border-t border-neutral-200 pt-1.5">
              <div className="flex justify-between items-start gap-2">
                <div className="font-bold text-neutral-900">
                  02. [SOBREMESA]
                </div>
                <div className="font-bold tabular-nums text-neutral-900">
                  R$ 0,00
                </div>
              </div>
              <div className="text-[11px] font-semibold text-neutral-800 pl-3">
                {order.dessert.name}
              </div>
            </div>
          )}

          {/* Bebida Não Alcoólica Inclusa (Sempre vem 01 inclusa) */}
          <div className="py-1 border-t border-neutral-200 pt-1.5">
            <div className="flex justify-between items-start gap-2">
              <div className="font-bold text-neutral-900">
                {order.dessert ? '03.' : '02.'} [BEBIDA NÃO ALCOÓLICA CORTESIA]
              </div>
              <div className="font-bold tabular-nums text-neutral-900">
                R$ 0,00
              </div>
            </div>
            <div className="text-[10px] text-neutral-700 pl-3">
              01 Bebida não alcoólica servida à vontade
            </div>
          </div>

          {order.notes && (
            <div className="text-[10px] text-neutral-600 bg-neutral-100 p-2 rounded mt-1.5">
              <span className="font-bold text-neutral-800">OBS: </span>
              {order.notes}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="py-2.5 border-b-2 border-dashed border-neutral-800 text-[11px] space-y-1">
          <div className="flex justify-between text-neutral-600">
            <span>SUBTOTAL:</span>
            <span className="tabular-nums">R$ 0,00</span>
          </div>
          <div className="flex justify-between text-emerald-800 font-medium">
            <span>CORTESIA EVENTO VIP (ALL-INCLUSIVE):</span>
            <span className="tabular-nums">- R$ 0,00</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-neutral-900 pt-1 border-t border-neutral-300">
            <span>TOTAL A PAGAR:</span>
            <span className="tabular-nums">R$ 0,00</span>
          </div>
          <div className="flex justify-between text-[10px] text-neutral-500 pt-0.5">
            <span>FORMA DE PGTO:</span>
            <span className="font-semibold text-neutral-800">
              FATURAMENTO EVENTO · BH RAJA
            </span>
          </div>
        </div>

        {/* Verification and QR */}
        <div className="pt-3 flex items-center justify-between gap-4">
          <div className="text-left space-y-0.5 text-[10px] text-neutral-600 flex-1">
            <div className="font-mono font-bold text-neutral-800">
              AUTENTICAÇÃO:
            </div>
            <div className="font-mono text-neutral-900 text-[9px]">
              {order.authCode}
            </div>
            <div>STATUS: [REGISTRADO NO EVENTO]</div>
          </div>

          <div className="w-16 h-16 bg-white p-1 border border-neutral-400 flex flex-col items-center justify-center shrink-0 rounded">
            <svg viewBox="0 0 100 100" className="w-full h-full text-neutral-900 fill-current">
              <rect x="0" y="0" width="30" height="30" />
              <rect x="5" y="5" width="20" height="20" fill="white" />
              <rect x="10" y="10" width="10" height="10" />
              <rect x="70" y="0" width="30" height="30" />
              <rect x="75" y="5" width="20" height="20" fill="white" />
              <rect x="80" y="10" width="10" height="10" />
              <rect x="0" y="70" width="30" height="30" />
              <rect x="5" y="75" width="20" height="20" fill="white" />
              <rect x="10" y="80" width="10" height="10" />
              <rect x="35" y="10" width="8" height="8" />
              <rect x="50" y="15" width="12" height="6" />
              <rect x="35" y="35" width="30" height="6" />
              <rect x="40" y="45" width="15" height="15" />
              <rect x="65" y="45" width="10" height="10" />
              <rect x="45" y="70" width="18" height="8" />
              <rect x="75" y="75" width="15" height="15" />
            </svg>
            <div className="text-[6px] text-neutral-500 tracking-tighter">
              BH RAJA VIP
            </div>
          </div>
        </div>

        <div className="text-center text-[10px] text-neutral-500 pt-3 mt-2 border-t border-neutral-300">
          BH Raja Hotel · {order.eventLocation}
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-neutral-400 no-print flex items-center gap-1.5">
        <Utensils className="w-3.5 h-3.5 text-[#d3a809]" />
        <span>Comanda registrada para pré-produção do buffet.</span>
      </div>
    </div>
  );
};
