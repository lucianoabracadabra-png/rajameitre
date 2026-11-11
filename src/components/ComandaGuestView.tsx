import React, { useState } from 'react';
import { EventConfig, MenuItem, GuestOrder, LanguageMode, VENUE_TRANSLATIONS } from '../types';
import type { SubmitOrderResult } from '../lib/api';
import { FiscalReceipt } from './FiscalReceipt';
import { DietaryIcons } from './DietaryIcons';
import {
  generateOrderCode,
  generateAuthHash,
  getCurrentTimeFormatted,
  getCurrentDateFormatted,
  formatDateFullExtenso,
  formatTimeRangeExtenso,
  normalizePassword,
} from '../utils/formatters';
import confetti from 'canvas-confetti';
import {
  Check,
  User,
  KeyRound,
  AlertCircle,
  GlassWater,
  ArrowRight,
  SlidersHorizontal,
  MapPin,
  Calendar,
  Clock,
  Languages,
} from 'lucide-react';

interface ComandaGuestViewProps {
  eventConfig: EventConfig;
  onSubmitOrder: (order: GuestOrder, code: string) => Promise<SubmitOrderResult>;
  onOpenAdmin: () => void;
}

export const ComandaGuestView: React.FC<ComandaGuestViewProps> = ({
  eventConfig,
  onSubmitOrder,
  onOpenAdmin,
}) => {
  // Language toggle (PT-BR vs EN-US)
  const [lang, setLang] = useState<LanguageMode>('pt');
  const isEn = lang === 'en';

  // Guest identification state
  const [guestName, setGuestName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Selections
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
  const [submitting, setSubmitting] = useState(false);

  // Formatted date and time por extenso
  const datePorExtenso = formatDateFullExtenso(eventConfig.date, lang);
  const timePorExtenso = formatTimeRangeExtenso(
    eventConfig.timeStart || '11:30',
    eventConfig.timeEnd || '14:30',
    lang
  );

  const fireLuxuryConfetti = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 55,
        origin: { y: 0.6 },
        colors: ['#d3a809', '#f3cb38', '#ffffff', '#a88200'],
      });
    } catch {
      // safe fallback
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFormError('');
    setPasswordError('');

    if (!guestName.trim()) {
      setFormError(
        isEn
          ? 'Please enter your full name for the ticket.'
          : 'Por favor, informe seu nome para a comanda.'
      );
      return;
    }

    if (!selectedMainDish) {
      setFormError(
        isEn
          ? 'Please select your main course.'
          : 'Por favor, selecione seu prato principal.'
      );
      return;
    }

    if (!password.trim()) {
      setPasswordError(
        isEn ? 'Please enter the event password.' : 'Por favor, digite a senha do evento.'
      );
      return;
    }

    const newOrder: GuestOrder = {
      id: `ord-${Date.now()}`,
      code: generateOrderCode(),
      eventId: eventConfig.id,
      guestName: guestName.trim(),
      pinUsed: normalizePassword(password),
      eventTitle: eventConfig.title, // NUNCA traduzido
      eventDate: getCurrentDateFormatted(),
      eventLocation: eventConfig.location,
      mainDish: selectedMainDish,
      dessert: eventConfig.allowDessert ? selectedDessert || undefined : undefined,
      beverageNotice: isEn
        ? '01 Non-Alcoholic Beverage (01 unit) Included'
        : '01 Bebida Não Alcoólica (01 und) Inclusa',
      notes: kitchenNotes.trim() || undefined,
      totalCost: 0,
      createdAt: getCurrentTimeFormatted(),
      authCode: generateAuthHash(guestName, eventConfig.title),
    };

    setSubmitting(true);
    const result = await onSubmitOrder(newOrder, password.trim());
    setSubmitting(false);

    if (!result.ok) {
      if (result.error === 'bad_code') {
        setPasswordError(
          isEn
            ? 'Incorrect event access password. Please verify.'
            : 'Senha de acesso incorreta para este evento.'
        );
      } else if (result.error === 'no_event') {
        setFormError(
          isEn
            ? 'This event is no longer active. Please contact hotel staff.'
            : 'Este evento não está mais disponível. Fale com a equipe do hotel.'
        );
      } else {
        setFormError(
          isEn
            ? 'Could not submit your ticket. Please check your connection and retry.'
            : 'Não foi possível enviar sua comanda. Verifique a conexão e tente novamente.'
        );
      }
      return;
    }

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

  // Translated venue name (predefined dictionary)
  const venueLabel = isEn && VENUE_TRANSLATIONS[eventConfig.location]
    ? VENUE_TRANSLATIONS[eventConfig.location].en
    : eventConfig.location;

  // Translated subtitle if available in EN
  const displaySubtitle = isEn && eventConfig.subtitleEn
    ? eventConfig.subtitleEn
    : eventConfig.subtitle;

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
            lang={lang}
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
      <div className="space-y-6">
        {/* TOP BRAND SIGNATURE & DISCREET MAÎTRE BUTTON */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-widest text-[#d3a809] uppercase font-display">
              Garç<span className="text-white">ON</span>
            </span>
            <span className="text-neutral-400 text-xs tracking-wider">
              · {eventConfig.hotelName}
            </span>
          </div>

          <button
            onClick={onOpenAdmin}
            className="text-[11px] text-neutral-400 hover:text-[#d3a809] flex items-center gap-1.5 transition-colors px-2 py-1 rounded hover:bg-white/[0.05] cursor-pointer"
            title="Acesso da Equipe do Hotel"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Maître</span>
          </button>
        </div>

        {/* EVENT IDENTIFICATION SECTION (CLIENT CANNOT PICK EVENT - DEDICATED DIRECT LINK) */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-wider text-[#d3a809] uppercase">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                BH Raja Hotel · {venueLabel}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 text-neutral-300">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                {datePorExtenso}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 text-neutral-300">
                <Clock className="w-3.5 h-3.5 text-[#d3a809]" />
                {timePorExtenso}
              </span>
            </div>

            {/* EVENT TITLE (NUNCA TRADUZIDO) */}
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-display pt-1">
              {eventConfig.title}
            </h1>
            <p className="text-xs text-neutral-300 font-light leading-relaxed">
              {displaySubtitle}
            </p>
          </div>

          {/* LANGUAGE TOGGLE BUTTON NEAR IDENTIFICATION SECTION */}
          <div className="pt-2 flex items-center justify-between border-t border-white/[0.06]">
            <div className="text-[11px] text-neutral-400 uppercase tracking-wider font-medium flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-[#d3a809]" />
              {isEn ? 'Language:' : 'Idioma:'}
            </div>

            <div className="inline-flex items-center p-0.5 rounded-lg bg-black/60 border border-white/[0.12]">
              <button
                type="button"
                onClick={() => setLang('pt')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                  !isEn
                    ? 'bg-[#d3a809] text-neutral-950 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                PT-BR
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                  isEn
                    ? 'bg-[#d3a809] text-neutral-950 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                EN-US
              </button>
            </div>
          </div>

          {/* Guest Name & Event Password Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#d3a809]" />
                {isEn ? 'Your Full Name *' : 'Seu Nome Completo *'}
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder={isEn ? 'e.g. Dr. John Doe' : 'Ex: Dra. Mariana Albuquerque'}
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.1] focus:border-[#d3a809] rounded-xl text-xs text-white placeholder-neutral-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#d3a809]" />
                {isEn ? 'Event Password *' : 'Senha do Evento *'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder={isEn ? 'Event password (e.g. 1123@ALM)' : 'Senha (ex: 1123@ALM)'}
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.1] focus:border-[#d3a809] rounded-xl text-xs text-white placeholder-neutral-500 outline-none transition-all font-mono tracking-wider uppercase"
              />
            </div>
          </div>

          {passwordError && (
            <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}
        </div>

        {/* 1. PRATO PRINCIPAL */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-1.5">
            <h2 className="text-lg font-bold text-white tracking-tight font-display">
              {isEn ? 'Main Course' : 'Prato Principal'}
            </h2>
            <span className="text-[11px] text-neutral-400">
              {isEn ? 'Select one dish' : 'Escolha uma opção'}
            </span>
          </div>

          <div className="space-y-2.5">
            {eventConfig.activeDishes.map((dish) => {
              const isSelected = selectedMainDish?.id === dish.id;
              const dishDescription = isEn && dish.descriptionEn ? dish.descriptionEn : dish.description;

              return (
                <div
                  key={dish.id}
                  onClick={() => setSelectedMainDish(dish)}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-200 active:scale-[0.99] ${
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

                      <p className="text-xs text-neutral-300 leading-relaxed font-light">
                        {dishDescription}
                      </p>

                      <div className="pt-1.5">
                        <DietaryIcons tags={dish.dietary} />
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        isSelected
                          ? 'bg-[#d3a809] text-neutral-950 font-bold shadow-sm scale-110'
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

        {/* 2. SOBREMESA */}
        {eventConfig.allowDessert && eventConfig.activeDesserts.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-1.5">
              <h2 className="text-lg font-bold text-white tracking-tight font-display">
                {isEn ? 'Dessert' : 'Sobremesa'}
              </h2>
              <span className="text-[11px] text-neutral-400">
                Pâtisserie
              </span>
            </div>

            <div className="space-y-2.5">
              {eventConfig.activeDesserts.map((dessert) => {
                const isSelected = selectedDessert?.id === dessert.id;
                const dessertDesc = isEn && dessert.descriptionEn ? dessert.descriptionEn : dessert.description;

                return (
                  <div
                    key={dessert.id}
                    onClick={() => setSelectedDessert(dessert)}
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-200 active:scale-[0.99] ${
                      isSelected ? 'glass-card-selected' : 'glass-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <h3 className="text-sm sm:text-base font-bold text-white font-display">
                          {dessert.name}
                        </h3>

                        <p className="text-xs text-neutral-300 leading-relaxed font-light">
                          {dessertDesc}
                        </p>

                        <div className="pt-1.5">
                          <DietaryIcons tags={dessert.dietary} />
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          isSelected
                            ? 'bg-[#d3a809] text-neutral-950 font-bold shadow-sm scale-110'
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

        {/* BEVERAGE CORTESIA NOTICE: 01 UND */}
        <div className="p-3.5 rounded-xl bg-[#d3a809]/10 border border-[#d3a809]/20 flex items-center gap-3">
          <GlassWater className="w-4 h-4 text-[#d3a809] shrink-0" />
          <div className="text-xs text-neutral-300 leading-relaxed">
            <span className="font-semibold text-[#d3a809]">
              {isEn ? '01 Non-Alcoholic Beverage included (01 unit):' : '01 Bebida não alcoólica inclusa (01 und):'}
            </span>{' '}
            {isEn
              ? 'Flavored mineral waters, fresh juices, botanical iced teas or soft drinks.'
              : 'Águas minerais aromatizadas, sucos naturais, chás gelados botânicos ou refrigerantes.'}
          </div>
        </div>

        {/* RESTRIÇÕES / OBSERVAÇÕES */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-neutral-300 uppercase tracking-wider">
            {isEn
              ? 'Special Notes or Dietary Restrictions (Optional)'
              : 'Observações ou Restrições Especiais (Opcional)'}
          </label>
          <input
            type="text"
            value={kitchenNotes}
            onChange={(e) => setKitchenNotes(e.target.value)}
            placeholder={
              isEn
                ? 'e.g. Meat temperature medium rare, severe nut allergy...'
                : 'Ex: Ponto da carne ao ponto para mal, sem nozes...'
            }
            className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.1] rounded-xl text-xs text-white placeholder-neutral-500 outline-none focus:border-[#d3a809] transition-all"
          />
        </div>

        {formError && (
          <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* SUBMIT BUTTON */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleSubmitOrder}
            disabled={submitting}
            className="w-full disabled:opacity-60 disabled:cursor-wait py-3.5 bg-[#d3a809] hover:bg-[#b89100] text-neutral-950 text-xs font-bold tracking-wider uppercase rounded-xl transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{submitting ? (isEn ? 'Submitting…' : 'Enviando…') : (isEn ? 'Issue My Ticket' : 'Emitir Minha Comanda')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MINIMAL FOOTER */}
      <footer className="text-center text-[11px] text-neutral-400 py-6 border-t border-white/[0.06] mt-8">
        <span>{eventConfig.hotelName} · GarçON</span>
      </footer>
    </div>
  );
};
