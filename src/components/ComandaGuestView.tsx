import React, { useState } from 'react';
import { EventConfig, MenuItem, GuestOrder } from '../types';
import { FiscalReceipt } from './FiscalReceipt';
import { DietaryIcons } from './DietaryIcons';
import {
  generateOrderCode,
  generateAuthHash,
  getCurrentTimeFormatted,
  getCurrentDateFormatted,
} from '../utils/formatters';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Check,
  User,
  KeyRound,
  AlertCircle,
  GlassWater,
  ArrowRight,
  SlidersHorizontal,
  MapPin,
  Calendar,
} from 'lucide-react';

interface ComandaGuestViewProps {
  eventConfig: EventConfig;
  onOrderCreated: (order: GuestOrder) => void;
  onOpenAdmin: () => void;
}

export const ComandaGuestView: React.FC<ComandaGuestViewProps> = ({
  eventConfig,
  onOrderCreated,
  onOpenAdmin,
}) => {
  // Guest state (NO TABLE FIELD)
  const [guestName, setGuestName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Selections (NO IMAGES, pure typography and tactile glassmorphic cards)
  const [selectedMainDish, setSelectedMainDish] = useState<MenuItem | null>(
    eventConfig.activeDishes[0] || null
  );
  const [selectedDessert, setSelectedDessert] = useState<MenuItem | null>(
    eventConfig.allowDessert ? eventConfig.activeDesserts[0] || null : null
  );
  const [kitchenNotes, setKitchenNotes] = useState('');

  // Order submission
  const [submittedOrder, setSubmittedOrder] = useState<GuestOrder | null>(null);
  const [formError, setFormError] = useState('');

  const fireLuxuryConfetti = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#d3a809', '#f3cb38', '#ffffff', '#a88200'],
      });
    } catch {
      // safe fallback
    }
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setPasswordError('');

    if (!guestName.trim()) {
      setFormError('Por favor, informe seu nome para a comanda.');
      return;
    }

    if (
      eventConfig.accessCode &&
      password.trim().toUpperCase() !== eventConfig.accessCode.toUpperCase()
    ) {
      setPasswordError(
        `Senha de acesso incorreta. (Senha do evento: ${eventConfig.accessCode})`
      );
      return;
    }

    if (!selectedMainDish) {
      setFormError('Por favor, selecione seu prato principal.');
      return;
    }

    const newOrder: GuestOrder = {
      id: `ord-${Date.now()}`,
      code: generateOrderCode(),
      guestName: guestName.trim(),
      pinUsed: password.trim(),
      eventTitle: eventConfig.title,
      eventDate: getCurrentDateFormatted(),
      eventLocation: eventConfig.location,
      mainDish: selectedMainDish,
      dessert: eventConfig.allowDessert ? selectedDessert || undefined : undefined,
      beverageNotice: '01 Bebida Não Alcoólica Inclusa (Cortesia BH Raja)',
      notes: kitchenNotes.trim() || undefined,
      totalCost: 0,
      createdAt: getCurrentTimeFormatted(),
      authCode: generateAuthHash(guestName, eventConfig.title),
    };

    onOrderCreated(newOrder);
    setSubmittedOrder(newOrder);
    fireLuxuryConfetti();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setSubmittedOrder(null);
    setGuestName('');
    setPassword('');
    setKitchenNotes('');
    setFormError('');
    setPasswordError('');
  };

  if (submittedOrder) {
    return (
      <div
        onClick={handleReset}
        className="min-h-screen py-10 px-4 flex flex-col justify-between cursor-pointer"
      >
        <div onClick={(e) => e.stopPropagation()} className="cursor-default">
          <FiscalReceipt
            order={submittedOrder}
            eventConfig={eventConfig}
            onReset={handleReset}
            onClose={handleReset}
          />
        </div>

        {/* Minimal isolated footer */}
        <div className="text-center text-[11px] text-neutral-400 py-6">
          <span>{eventConfig.hotelName} · GarçON</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="space-y-8">
        {/* TOP BRAND SIGNATURE & STAFF ICON */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-widest text-[#d3a809] uppercase font-display">
              Garç<span className="text-white">ON</span>
            </span>
            <span className="text-neutral-400 text-xs tracking-wider">
              · {eventConfig.hotelName}
            </span>
          </div>

          {/* Discreet Maître exit switch for venue shared devices */}
          <button
            onClick={onOpenAdmin}
            className="text-[11px] text-neutral-400 hover:text-[#d3a809] flex items-center gap-1.5 transition-colors px-2 py-1 rounded hover:bg-white/[0.05] cursor-pointer"
            title="Acesso da Equipe do Hotel"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Maître</span>
          </button>
        </div>

        {/* EVENT IDENTIFICATION (SEMPRE NO HOTEL COM SALA FIXA) */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-wider text-[#d3a809] uppercase">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                BH Raja Hotel · {eventConfig.location}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 text-neutral-400">
                <Calendar className="w-3.5 h-3.5" />
                {eventConfig.date}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-display">
              {eventConfig.title}
            </h1>
            <p className="text-xs text-neutral-400 font-light">
              {eventConfig.subtitle}
            </p>
          </div>

          {/* Guest Name & Event Password Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#d3a809]" />
                Seu Nome Completo *
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Ex: Dra. Mariana Albuquerque"
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.1] focus:border-[#d3a809] rounded-xl text-xs text-white placeholder-neutral-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#d3a809]" />
                  Senha do Evento *
                </label>
                <button
                  type="button"
                  onClick={() => setPassword(eventConfig.accessCode)}
                  className="text-[10px] text-[#d3a809] hover:underline cursor-pointer"
                >
                  Preencher ({eventConfig.accessCode})
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Senha de acesso"
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.1] focus:border-[#d3a809] rounded-xl text-xs text-white placeholder-neutral-500 outline-none transition-all font-mono tracking-wider uppercase"
              />
            </div>
          </div>

          {passwordError && (
            <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}
        </div>

        {/* 1. PRATO PRINCIPAL */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-1.5">
            <h2 className="text-lg font-bold text-white tracking-tight font-display">
              Prato Principal
            </h2>
            <span className="text-[11px] text-neutral-400">
              Escolha uma opção
            </span>
          </div>

          <div className="space-y-2.5">
            {eventConfig.activeDishes.map((dish) => {
              const isSelected = selectedMainDish?.id === dish.id;

              return (
                <div
                  key={dish.id}
                  onClick={() => setSelectedMainDish(dish)}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                    isSelected ? 'glass-card-selected' : 'glass-card'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-white font-display">
                          {dish.name}
                        </h3>
                        {dish.highlight && (
                          <span className="text-[9px] text-[#d3a809] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-[#d3a809]/10 border border-[#d3a809]/20">
                            {dish.highlight}
                          </span>
                        )}
                      </div>

                      {dish.frenchTitle && (
                        <p className="text-xs text-neutral-400">
                          {dish.frenchTitle}
                        </p>
                      )}

                      <p className="text-xs text-neutral-300 leading-relaxed font-light">
                        {dish.description}
                      </p>

                      <div className="pt-1.5">
                        <DietaryIcons tags={dish.dietary} />
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isSelected
                          ? 'bg-[#d3a809] text-neutral-950 font-bold shadow-sm'
                          : 'border border-neutral-700'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 2. SOBREMESA (SE HABILITADA NO EVENTO) */}
        {eventConfig.allowDessert && eventConfig.activeDesserts.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-1.5">
              <h2 className="text-lg font-bold text-white tracking-tight font-display">
                Sobremesa
              </h2>
              <span className="text-[11px] text-neutral-400">
                Pâtisserie
              </span>
            </div>

            <div className="space-y-2.5">
              {eventConfig.activeDesserts.map((dessert) => {
                const isSelected = selectedDessert?.id === dessert.id;

                return (
                  <div
                    key={dessert.id}
                    onClick={() => setSelectedDessert(dessert)}
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                      isSelected ? 'glass-card-selected' : 'glass-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <h3 className="text-sm sm:text-base font-bold text-white font-display">
                          {dessert.name}
                        </h3>

                        {dessert.frenchTitle && (
                          <p className="text-xs text-neutral-400">
                            {dessert.frenchTitle}
                          </p>
                        )}

                        <p className="text-xs text-neutral-300 leading-relaxed font-light">
                          {dessert.description}
                        </p>

                        <div className="pt-1.5">
                          <DietaryIcons tags={dessert.dietary} />
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isSelected
                            ? 'bg-[#d3a809] text-neutral-950 font-bold shadow-sm'
                            : 'border border-neutral-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* BEVERAGE CORTESIA NOTICE */}
        <div className="p-3.5 rounded-xl bg-[#d3a809]/10 border border-[#d3a809]/20 flex items-center gap-3">
          <GlassWater className="w-4 h-4 text-[#d3a809] shrink-0" />
          <div className="text-xs text-neutral-300 leading-relaxed">
            <span className="font-semibold text-[#d3a809]">
              01 Bebida não alcoólica inclusa:
            </span>{' '}
            Águas minerais aromatizadas, sucos naturais, chás gelados botânicos ou refrigerantes servidos à vontade pela equipe do salão.
          </div>
        </div>

        {/* RESTRIÇÕES / OBSERVAÇÕES */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
            Observações ou Restrições Especiais (Opcional)
          </label>
          <input
            type="text"
            value={kitchenNotes}
            onChange={(e) => setKitchenNotes(e.target.value)}
            placeholder="Ex: Ponto da carne ao ponto para mal, sem nozes..."
            className="w-full px-3.5 py-2 bg-black/40 border border-white/[0.1] rounded-xl text-xs text-white placeholder-neutral-500 outline-none focus:border-[#d3a809] transition-all"
          />
        </div>

        {formError && (
          <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* SUBMIT BUTTON */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSubmitOrder}
            className="w-full py-3.5 bg-gradient-to-r from-[#d3a809] via-[#e5bc2c] to-[#b38b00] text-neutral-950 text-xs font-bold tracking-wider uppercase rounded-xl hover:from-[#e3b819] hover:to-[#c49800] transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Emitir Minha Comanda</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MINIMAL FOOTER */}
      <footer className="text-center text-[11px] text-neutral-400 py-6 border-t border-white/[0.06] mt-8">
        <span>BH Raja Hotel · GarçON</span>
      </footer>
    </div>
  );
};
