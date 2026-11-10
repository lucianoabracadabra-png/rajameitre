import React, { useEffect } from 'react';
import { GuestOrder, EventConfig } from '../types';
import { FiscalReceipt } from './FiscalReceipt';
import { X } from 'lucide-react';

interface ReceiptModalProps {
  order: GuestOrder | null;
  eventConfig: EventConfig;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  order,
  eventConfig,
  onClose,
}) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!order) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto cursor-pointer"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md my-auto py-4 cursor-default"
      >
        {/* Top small X close button bar */}
        <div className="flex justify-end mb-2 no-print">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-neutral-300 hover:text-white border border-white/[0.1] transition-all cursor-pointer shadow-sm"
            title="Fechar (Esc)"
            aria-label="Fechar cupom"
          >
            <X className="w-3.5 h-3.5 text-[#d3a809]" />
            <span className="text-[11px]">Fechar</span>
          </button>
        </div>

        <FiscalReceipt
          order={order}
          eventConfig={eventConfig}
          onReset={onClose}
          onClose={onClose}
        />
      </div>
    </div>
  );
};
