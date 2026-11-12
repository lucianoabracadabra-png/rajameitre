import React, { useState, useEffect } from 'react';
import { EventConfig, MenuItem, HotelVenue, ALLOWED_DIETARY_TAGS } from '../types';
import { CaixaSlot } from '../lib/api';
import {
  Settings,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Check,
  Sparkles,
  Utensils,
  Cake,
  MapPin,
  Calendar,
  Clock,
  KeyRound,
  Users,
  Phone,
  User,
  Languages,
  Loader2,
  Layers,
  AlertCircle,
  Copy,
  Tag,
  ArrowRight,
  FolderOpen,
  X,
} from 'lucide-react';
import { DietaryIcons } from './DietaryIcons';
import { HOTEL_INFO } from '../data/menuDatabase';
import {
  generateEventPassword,
  formatBrazilianPhone,
  formatTimeRangeExtenso,
  formatDateFullExtenso,
  formatEventCountdown,
  getEventWeekBucket,
} from '../utils/formatters';
import { translateTextWithAI } from '../lib/api';

interface EventConfigViewProps {
  events: EventConfig[];
  eventLibrary: EventConfig[];
  caixaSlots: CaixaSlot[];
  currentEventId: string;
  onSelectEvent: (eventId: string) => void;
  onAllocateSlot: (slotNumber: number, eventId: string | null) => void;
  onUpdateEventConfig: (newConfig: EventConfig) => void;
  onCreateNewEventInLibrary: (newEvent: EventConfig, allocateToSlotNumber?: number) => void;
  onDeleteEventFromLibrary: (eventId: string) => void;
  masterDatabase: MenuItem[];
  onResetToDefault: () => void;
  onOpenGuestComanda: () => void;
}

export const EventConfigView: React.FC<EventConfigViewProps> = ({
  events,
  eventLibrary,
  caixaSlots,
  currentEventId,
  onSelectEvent,
  onAllocateSlot,
  onUpdateEventConfig,
  onCreateNewEventInLibrary,
  onDeleteEventFromLibrary,
  masterDatabase,
  onResetToDefault,
}) => {
  // Active event being edited: find in library or allocated events
  const activeEvent =
    eventLibrary.find((e) => e.id === currentEventId) ||
    events.find((e) => e.id === currentEventId) ||
    eventLibrary[0] ||
    events[0];

  const [formData, setFormData] = useState<EventConfig>({ ...activeEvent });
  const [isSaved, setIsSaved] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Quick edit dish in active event
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [tempDishName, setTempDishName] = useState('');
  const [tempDishHighlight, setTempDishHighlight] = useState('');
  const [tempDishHighlightEn, setTempDishHighlightEn] = useState('');
  const [tempDishDesc, setTempDishDesc] = useState('');
  const [tempDishDescEn, setTempDishDescEn] = useState('');
  const [tempDishTags, setTempDishTags] = useState<string[]>([]);
  const [translatingDescEngine, setTranslatingDescEngine] = useState<'google' | 'gemini' | null>(null);
  const [translatingDishEngine, setTranslatingDishEngine] = useState<'google' | 'gemini' | null>(null);
  const [repoWeekTab, setRepoWeekTab] = useState<'current_week' | 'previous_week' | 'next_week' | 'all'>('current_week');
  const [copiedSlot, setCopiedSlot] = useState<number | null>(null);

  // Sync form data whenever active event changes
  useEffect(() => {
    if (activeEvent) {
      setFormData({
        ...activeEvent,
        timeStart: activeEvent.timeStart || '11:30',
        timeEnd: activeEvent.timeEnd || '14:30',
      });
    }
  }, [activeEvent?.id]);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const formattedTime = formatTimeRangeExtenso(formData.timeStart || '11:30', formData.timeEnd || '14:30', 'pt');
    const updated: EventConfig = {
      ...formData,
      time: formattedTime,
    };
    onUpdateEventConfig(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2200);
  };

  const handleGeneratePassword = () => {
    const newCode = generateEventPassword(formData.title, formData.date);
    setFormData((prev) => ({ ...prev, accessCode: newCode }));
  };

  const handleTranslateEventDescription = async (engine: 'google' | 'gemini') => {
    if (!formData.subtitle.trim()) return;
    setTranslatingDescEngine(engine);
    try {
      const translated = await translateTextWithAI(formData.subtitle, 'en', 'event_description', engine);
      setFormData((prev) => ({ ...prev, subtitleEn: translated }));
    } finally {
      setTranslatingDescEngine(null);
    }
  };

  const handleTranslateQuickDish = async (engine: 'google' | 'gemini') => {
    if (!tempDishDesc.trim()) return;
    setTranslatingDishEngine(engine);
    try {
      const translated = await translateTextWithAI(tempDishDesc, 'en', 'dish', engine);
      setTempDishDescEn(translated);
    } finally {
      setTranslatingDishEngine(null);
    }
  };

  const handlePhoneChange = (val: string) => {
    const formatted = formatBrazilianPhone(val);
    setFormData((prev) => ({ ...prev, coordinatorPhone: formatted }));
  };

  const handleCopySlotLink = (slotNumber: number, slug: string) => {
    const url = `${window.location.origin}${window.location.pathname}#/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlot(slotNumber);
    setTimeout(() => setCopiedSlot(null), 2000);
  };

  const handleCreateBlankEvent = (slotNumber?: number) => {
    const newId = `evt-${Date.now()}`;
    const todayStr = new Date().toISOString().split('T')[0];
    const generatedPwd = generateEventPassword('NOVO EVENTO', todayStr);
    const formattedTime = formatTimeRangeExtenso('11:30', '14:30', 'pt');

    const defaultDishes = masterDatabase.filter((m) => m.category === 'main').slice(0, 3);
    const defaultDesserts = masterDatabase.filter((m) => m.category === 'dessert').slice(0, 2);

    const newEvent: EventConfig = {
      id: newId,
      slug: slotNumber ? `eve${slotNumber}` : `eve-${Date.now().toString().slice(-4)}`,
      title: 'Novo Evento',
      subtitle: 'Almoço Gastronômico Especial BH Raja Hotel',
      subtitleEn: 'Special Gastronomic Lunch BH Raja Hotel',
      date: todayStr,
      time: formattedTime,
      timeStart: '11:30',
      timeEnd: '14:30',
      location: 'Espaço Panorâmico',
      hotelName: HOTEL_INFO.name,
      hotelAddress: HOTEL_INFO.address,
      cnpj: HOTEL_INFO.cnpj,
      accessCode: generatedPwd,
      allowDessert: true,
      defaultBeverageIncluded: true,
      totalReservations: 50,
      coordinatorName: '',
      coordinatorPhone: '',
      welcomeMessage: 'Identifique-se para emitir sua comanda.',
      welcomeMessageEn: 'Please enter your name to issue your digital ticket.',
      activeDishes: defaultDishes,
      activeDesserts: defaultDesserts,
    };

    onCreateNewEventInLibrary(newEvent, slotNumber);
    onSelectEvent(newEvent.id);
    setFormData(newEvent);

    // Smooth scroll directly to the parameters form
    setTimeout(() => {
      const el = document.getElementById('event-config-form');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleRemoveDish = (dishId: string) => {
    const updatedDishes = formData.activeDishes.filter((d) => d.id !== dishId);
    const updated = { ...formData, activeDishes: updatedDishes };
    setFormData(updated);
    onUpdateEventConfig(updated);
  };

  const handleRemoveDessert = (dessertId: string) => {
    const updatedDesserts = formData.activeDesserts.filter((d) => d.id !== dessertId);
    const updated = { ...formData, activeDesserts: updatedDesserts };
    setFormData(updated);
    onUpdateEventConfig(updated);
  };

  const handleStartEditDish = (dish: MenuItem) => {
    setEditingDishId(dish.id);
    setTempDishName(dish.name);
    setTempDishHighlight(dish.highlight || '');
    setTempDishHighlightEn(dish.highlightEn || '');
    setTempDishDesc(dish.description);
    setTempDishDescEn(dish.descriptionEn || '');
    setTempDishTags([...dish.dietary]);
  };

  const toggleTempTag = (tag: string) => {
    if (tempDishTags.includes(tag)) {
      setTempDishTags(tempDishTags.filter((t) => t !== tag));
    } else {
      setTempDishTags([...tempDishTags, tag]);
    }
  };

  const handleSaveDishEdit = (dishId: string) => {
    const updatedDishes = formData.activeDishes.map((d) => {
      if (d.id === dishId) {
        return {
          ...d,
          name: tempDishName,
          highlight: tempDishHighlight.trim() || undefined,
          highlightEn: tempDishHighlightEn.trim() || undefined,
          description: tempDishDesc,
          descriptionEn: tempDishDescEn.trim() || undefined,
          dietary: [...tempDishTags],
        };
      }
      return d;
    });

    const updatedDesserts = formData.activeDesserts.map((d) => {
      if (d.id === dishId) {
        return {
          ...d,
          name: tempDishName,
          highlight: tempDishHighlight.trim() || undefined,
          highlightEn: tempDishHighlightEn.trim() || undefined,
          description: tempDishDesc,
          descriptionEn: tempDishDescEn.trim() || undefined,
          dietary: [...tempDishTags],
        };
      }
      return d;
    });

    const updated = {
      ...formData,
      activeDishes: updatedDishes,
      activeDesserts: updatedDesserts,
    };
    setFormData(updated);
    onUpdateEventConfig(updated);
    setEditingDishId(null);
  };

  const handleImportFromDB = (masterItem: MenuItem) => {
    const clonedItem: MenuItem = {
      ...masterItem,
      id: `evt-${masterItem.id}-${Date.now()}`,
    };

    const updatedDishes = [...formData.activeDishes];
    const updatedDesserts = [...formData.activeDesserts];

    if (masterItem.category === 'main') {
      updatedDishes.push(clonedItem);
    } else if (masterItem.category === 'dessert') {
      updatedDesserts.push(clonedItem);
    }

    const updated = {
      ...formData,
      activeDishes: updatedDishes,
      activeDesserts: updatedDesserts,
    };

    setFormData(updated);
    onUpdateEventConfig(updated);
    setShowImportModal(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-7 px-4 sm:px-6 space-y-7">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#d3a809] uppercase tracking-widest">
            <Settings className="w-4 h-4" />
            <span>Painel do Maître · Alocação de Caixas</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-display mt-0.5">
            Eventos & Parâmetros
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleCreateBlankEvent()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#d3a809]/20 hover:bg-[#d3a809]/30 border border-[#d3a809]/40 text-[#d3a809] text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            + Criar Novo Evento
          </button>

          <button
            type="button"
            onClick={onResetToDefault}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/40 hover:bg-black/60 border border-white/[0.1] text-neutral-300 text-xs rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
            Restaurar Pratos do DB
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#d3a809] hover:bg-[#b89100] text-neutral-950 text-xs font-bold uppercase rounded-lg transition-all shadow-sm cursor-pointer active:scale-95"
          >
            {isSaved ? (
              <>
                <Check className="w-3.5 h-3.5 text-neutral-950 stroke-[3]" />
                Salvo!
              </>
            ) : (
              'Salvar Alterações'
            )}
          </button>
        </div>
      </div>

      {/* SECTION 1: EVENTOS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#d3a809] flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#d3a809]" />
            EVENTOS
          </span>
          <span className="text-[11px] text-neutral-400">
            Caixas de atendimento simultâneo (#1 a #4)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {caixaSlots.map((slot) => {
            const allocatedEvent = slot.eventId
              ? eventLibrary.find((e) => e.id === slot.eventId) || events.find((e) => e.id === slot.eventId)
              : null;
            const isEditingThis = allocatedEvent?.id === activeEvent?.id;
            const countdown = allocatedEvent ? formatEventCountdown(allocatedEvent.date) : null;

            // Events sorted by date relevance (closest to today or most recent first)
            const sortedEventsForSlot = [...eventLibrary].sort((a, b) => {
              const diffA = Math.abs(new Date(a.date).getTime() - Date.now());
              const diffB = Math.abs(new Date(b.date).getTime() - Date.now());
              return diffA - diffB;
            });

            return (
              <div
                key={slot.slotKey}
                className={`rounded-2xl p-4 flex flex-col justify-between border transition-all ${
                  allocatedEvent
                    ? countdown?.isPast
                      ? 'bg-neutral-900/60 border-neutral-700/80 opacity-75 grayscale contrast-125'
                      : isEditingThis
                      ? 'bg-[#d3a809]/15 border-[#d3a809] shadow-lg ring-1 ring-[#d3a809]/50'
                      : 'bg-black/50 border-white/[0.12] hover:border-white/[0.25]'
                    : 'bg-white/[0.01] border-dashed border-white/[0.15] hover:border-white/[0.3]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#d3a809] uppercase tracking-wider">
                      Caixa #{slot.slotNumber}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400 bg-white/[0.06] px-1.5 py-0.5 rounded">
                      {slot.slug}
                    </span>
                  </div>

                  {allocatedEvent ? (
                    <>
                      <div>
                        <h4 className="text-sm font-bold text-white font-display line-clamp-1">
                          {allocatedEvent.title}
                        </h4>
                        <div className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#d3a809] shrink-0" />
                          <span className="truncate">{allocatedEvent.location}</span>
                        </div>
                        <div className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-neutral-500 shrink-0" />
                          <span>{allocatedEvent.date}</span>
                          <span>·</span>
                          <span className="font-mono text-neutral-300">{allocatedEvent.accessCode}</span>
                        </div>

                        {/* COUNTDOWN BADGE */}
                        {countdown && (
                          <div className="mt-1.5 flex items-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                countdown.badgeStyle === 'today'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                                  : countdown.badgeStyle === 'upcoming'
                                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                  : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                              }`}
                            >
                              <Clock className="w-2.5 h-2.5" />
                              {countdown.label}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 flex flex-wrap gap-1.5 border-t border-white/[0.08]">
                        <button
                          type="button"
                          onClick={() => onSelectEvent(allocatedEvent.id)}
                          className={`text-[10px] font-semibold px-2 py-1 rounded cursor-pointer transition-colors ${
                            isEditingThis
                              ? 'bg-[#d3a809] text-neutral-950'
                              : 'bg-white/[0.06] text-neutral-300 hover:text-white'
                          }`}
                        >
                          {isEditingThis ? 'Editando' : 'Editar'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopySlotLink(slot.slotNumber, slot.slug)}
                          className="text-[10px] bg-white/[0.06] text-neutral-300 hover:text-white px-2 py-1 rounded flex items-center gap-1 cursor-pointer"
                          title="Copiar link do QR Code"
                        >
                          {copiedSlot === slot.slotNumber ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-[#d3a809]" />
                          )}
                          <span>Link QR</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onAllocateSlot(slot.slotNumber, null)}
                          className="text-[10px] text-rose-400 hover:text-rose-300 px-1.5 py-1 rounded hover:bg-rose-500/10 cursor-pointer ml-auto"
                          title="Desalocar esta caixa"
                        >
                          Desalocar
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="py-2.5 text-center space-y-2">
                      <div className="text-xs font-semibold text-neutral-400">Caixa Vazia</div>
                      <div className="flex flex-col gap-1 text-left">
                        <label className="text-[10px] uppercase font-semibold text-neutral-400">
                          Eventos:
                        </label>
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value === '__new__') {
                              handleCreateBlankEvent(slot.slotNumber);
                            } else if (e.target.value) {
                              onAllocateSlot(slot.slotNumber, e.target.value);
                            }
                          }}
                          className="w-full px-2 py-1.5 bg-black/60 border border-white/[0.15] rounded text-[11px] text-neutral-200 outline-none focus:border-[#d3a809] truncate"
                        >
                          <option value="" disabled>
                            Selecione da lista...
                          </option>
                          {sortedEventsForSlot.map((libEvt) => {
                            const c = formatEventCountdown(libEvt.date);
                            return (
                              <option key={libEvt.id} value={libEvt.id}>
                                {libEvt.date} · {libEvt.title} ({c.label})
                              </option>
                            );
                          })}
                          <option value="__new__">+ Criar Novo para esta Caixa</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: PARÂMETROS DO EVENTO EM EDIÇÃO */}
      <form id="event-config-form" onSubmit={handleSave} className="space-y-6 glass-panel p-5 sm:p-6 rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
          <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2 font-display">
            <Sparkles className="w-4 h-4 text-[#d3a809]" />
            Parâmetros do Evento: <span className="text-[#d3a809]">{formData.title}</span>
          </h2>
          <span className="text-xs text-neutral-400 font-mono">ID: {formData.id}</span>
        </div>

        {/* CORE PARAMETERS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* TITLE (NUNCA TRADUZIDO) */}
          <div className="space-y-1 lg:col-span-2">
            <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider block">
              Título Oficial (Nunca Traduzido por IA) *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-xs text-white focus:border-[#d3a809] outline-none font-medium"
              required
            />
          </div>

          {/* DATE PICKER (CALENDÁRIO NATIVO) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#d3a809]" />
              Data do Evento *
            </label>
            <input
              type="date"
              value={formData.date || ''}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-xs text-white focus:border-[#d3a809] outline-none font-mono"
              required
            />
            <span className="text-[10px] text-neutral-400 block">
              Na comanda: <strong className="text-white">{formatDateFullExtenso(formData.date, 'pt')}</strong>
            </span>
          </div>

          {/* TIME: 2 RELOGINHOS (START E END) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#d3a809]" />
              Horário do Almoço *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-neutral-400 block mb-0.5">Início:</span>
                <input
                  type="time"
                  value={formData.timeStart || '11:30'}
                  onChange={(e) => setFormData({ ...formData, timeStart: e.target.value })}
                  className="w-full px-3 py-1.5 bg-black/50 border border-white/[0.12] rounded-xl text-xs text-white focus:border-[#d3a809] outline-none font-mono"
                  required
                />
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block mb-0.5">Término:</span>
                <input
                  type="time"
                  value={formData.timeEnd || '14:30'}
                  onChange={(e) => setFormData({ ...formData, timeEnd: e.target.value })}
                  className="w-full px-3 py-1.5 bg-black/50 border border-white/[0.12] rounded-xl text-xs text-white focus:border-[#d3a809] outline-none font-mono"
                  required
                />
              </div>
            </div>
            <span className="text-[10px] text-neutral-400 block">
              Na comanda: <strong className="text-white">{formatTimeRangeExtenso(formData.timeStart, formData.timeEnd, 'pt')}</strong>
            </span>
          </div>

          {/* ACCESS CODE WITHOUT SLASHES */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-[#d3a809]" />
                Senha de Acesso *
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-[10px] text-[#d3a809] hover:underline cursor-pointer"
              >
                Gerar Senha
              </button>
            </div>
            <input
              type="text"
              value={formData.accessCode}
              onChange={(e) => setFormData({ ...formData, accessCode: e.target.value.replace(/[\/\s]/g, '').toUpperCase() })}
              className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-xs text-white font-mono focus:border-[#d3a809] outline-none uppercase tracking-wider"
              required
            />
          </div>

          {/* TOTAL RESERVATIONS */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3 text-[#d3a809]" />
              Total de Reservas Feitas *
            </label>
            <input
              type="number"
              min="1"
              max="500"
              value={formData.totalReservations || 0}
              onChange={(e) =>
                setFormData({ ...formData, totalReservations: parseInt(e.target.value, 10) || 0 })
              }
              className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-xs text-white focus:border-[#d3a809] outline-none font-mono"
            />
          </div>

          {/* COORDINATOR WITH AUTOMATIC PHONE FORMATTING */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1">
              <User className="w-3 h-3 text-[#d3a809]" />
              Responsável pelo Evento
            </label>
            <input
              type="text"
              value={formData.coordinatorName || ''}
              onChange={(e) => setFormData({ ...formData, coordinatorName: e.target.value })}
              className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-xs text-white focus:border-[#d3a809] outline-none"
            />
          </div>

          <div className="space-y-1 lg:col-span-2">
            <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1">
              <Phone className="w-3 h-3 text-[#d3a809]" />
              Telefone do Responsável (DDD 31 Automático)
            </label>
            <input
              type="text"
              value={formData.coordinatorPhone || ''}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-xs text-white focus:border-[#d3a809] outline-none font-mono"
            />
            <span className="text-[10px] text-neutral-400">
              DDD 31 padrão, converte 8 dígitos para (31) 9 XXXX-XXXX.
            </span>
          </div>
        </div>

        {/* VENUE SELECTION */}
        <div className="space-y-1.5 pt-1 border-t border-white/[0.08]">
          <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#d3a809]" />
            Espaço no BH Raja Hotel *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
            {HOTEL_INFO.venues.map((venue) => {
              const isSelected = formData.location === venue;
              return (
                <button
                  key={venue}
                  type="button"
                  onClick={() => setFormData({ ...formData, location: venue })}
                  className={`py-2 px-2 text-xs font-medium rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#d3a809] text-neutral-950 font-bold border-[#d3a809] shadow-sm'
                      : 'bg-black/30 border-white/[0.08] text-neutral-300 hover:text-white hover:border-white/[0.2]'
                  }`}
                >
                  {venue}
                </button>
              );
            })}
          </div>
        </div>

        {/* BILINGUAL PARTITIONED CONFIGURATION: PT-BR vs EN-US */}
        <div className="pt-2 border-t border-white/[0.08]">
          <div className="mb-3">
            <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
              <Languages className="w-4 h-4 text-[#d3a809]" />
              Configuração descritiva
            </span>
            <p className="text-[11px] text-neutral-400">
              Personalize os textos em Português e a versão correspondente em Inglês com suporte a tradução via Google Translate ou Gemini IA.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PAINEL PT-BR */}
            <div className="rounded-2xl p-4 sm:p-5 border border-[#d3a809]/40 bg-gradient-to-br from-[#00001f] via-[#0b0c2a] to-amber-950/20 shadow-md space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#d3a809]/20 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🇧🇷</span>
                  <span className="text-xs font-bold text-[#d3a809] uppercase tracking-wider">
                    Painel PT-BR (Português)
                  </span>
                </div>
                <span className="text-[10px] text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded font-mono">
                  Original
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider block">
                  Subtítulo / Descrição Geral (PT-BR)
                </label>
                <textarea
                  rows={2}
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full px-3 py-2 bg-black/60 border border-white/[0.12] rounded-xl text-xs text-white focus:border-[#d3a809] outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider block">
                  Mensagem de Boas-Vindas da Comanda (PT-BR)
                </label>
                <input
                  type="text"
                  value={formData.welcomeMessage || 'Identifique-se para emitir sua comanda.'}
                  onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                  className="w-full px-3 py-2 bg-black/60 border border-white/[0.12] rounded-xl text-xs text-white focus:border-[#d3a809] outline-none"
                />
              </div>
            </div>

            {/* PAINEL EN-US */}
            <div className="rounded-2xl p-4 sm:p-5 border border-sky-500/40 bg-gradient-to-br from-[#000028] via-[#071330] to-sky-950/30 shadow-md space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-500/20 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🇺🇸</span>
                  <span className="text-xs font-bold text-sky-300 uppercase tracking-wider">
                    Painel EN-US (English Slot)
                  </span>
                </div>

                {/* DUAL TRANSLATION BUTTONS */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTranslateEventDescription('google')}
                    disabled={translatingDescEngine !== null || !formData.subtitle.trim()}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-200 rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
                    title="Traduzir via Google Translate"
                  >
                    {translatingDescEngine === 'google' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Languages className="w-3 h-3" />
                    )}
                    <span>Google Translate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTranslateEventDescription('gemini')}
                    disabled={translatingDescEngine !== null || !formData.subtitle.trim()}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 bg-[#d3a809]/20 hover:bg-[#d3a809]/30 border border-[#d3a809]/40 text-[#d3a809] rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
                    title="Traduzir via Gemini IA (Flash)"
                  >
                    {translatingDescEngine === 'gemini' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    <span>Gemini IA</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider block">
                  Subtitle / General Description (EN-US - Editável Manualmente)
                </label>
                <textarea
                  rows={2}
                  value={formData.subtitleEn || ''}
                  onChange={(e) => setFormData({ ...formData, subtitleEn: e.target.value })}
                  className="w-full px-3 py-2 bg-black/60 border border-sky-500/20 rounded-xl text-xs text-white focus:border-sky-400 outline-none italic resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider block">
                  Welcome Message on Guest Comanda (EN-US - Editável Manualmente)
                </label>
                <input
                  type="text"
                  value={formData.welcomeMessageEn || 'Please enter your name to issue your digital ticket.'}
                  onChange={(e) => setFormData({ ...formData, welcomeMessageEn: e.target.value })}
                  className="w-full px-3 py-2 bg-black/60 border border-sky-500/20 rounded-xl text-xs text-white focus:border-sky-400 outline-none italic"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SOBREMESA TOGGLE */}
        <div className="pt-2 border-t border-white/[0.08]">
          <label className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/[0.08] cursor-pointer hover:border-white/[0.15] transition-colors">
            <input
              type="checkbox"
              checked={formData.allowDessert}
              onChange={(e) => setFormData({ ...formData, allowDessert: e.target.checked })}
              className="w-4 h-4 accent-[#d3a809] cursor-pointer"
            />
            <div className="text-xs font-bold text-white flex items-center gap-1.5 font-display">
              <Cake className="w-3.5 h-3.5 text-[#d3a809]" />
              Habilitar Escolha de Sobremesas para os Convidados
            </div>
          </label>
        </div>
      </form>

      {/* SECTION 3: PRATOS PRINCIPAIS ATIVOS DO EVENTO */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-display">
              <Utensils className="w-4 h-4 text-[#d3a809]" />
              Pratos Principais Ativos ({formData.activeDishes.length})
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-[#d3a809] text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Puxar do Acervo Mestre
          </button>
        </div>

        <div className="space-y-2.5">
          {formData.activeDishes.map((dish) => {
            const isEditing = editingDishId === dish.id;
            const hasEnglishDesc = Boolean(dish.descriptionEn && dish.descriptionEn.trim());

            return (
              <div key={dish.id} className="glass-card p-3.5 rounded-xl space-y-2">
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-400 uppercase">
                        Nome no Evento (Único):
                      </label>
                      <input
                        type="text"
                        value={tempDishName}
                        onChange={(e) => setTempDishName(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 bg-black/60 border border-white/[0.15] rounded-lg text-xs text-white outline-none focus:border-[#d3a809]"
                      />
                    </div>

                    {/* DESTAQUE PT & EN IN QUICK EDIT */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-neutral-400 uppercase">
                          Destaque (PT-BR):
                        </label>
                        <input
                          type="text"
                          value={tempDishHighlight}
                          onChange={(e) => setTempDishHighlight(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 bg-black/60 border border-white/[0.15] rounded-lg text-xs text-white outline-none focus:border-[#d3a809]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-neutral-400 uppercase">
                          Destaque (EN-US):
                        </label>
                        <input
                          type="text"
                          value={tempDishHighlightEn}
                          onChange={(e) => setTempDishHighlightEn(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 bg-black/60 border border-white/[0.15] rounded-lg text-xs text-white outline-none focus:border-[#d3a809] italic"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <label className="text-[11px] font-semibold text-neutral-400 uppercase">
                          Descrição (PT-BR):
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTranslateQuickDish('google')}
                            disabled={translatingDishEngine !== null || !tempDishDesc.trim()}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-200 rounded disabled:opacity-50 cursor-pointer"
                          >
                            {translatingDishEngine === 'google' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                            <span>Google</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTranslateQuickDish('gemini')}
                            disabled={translatingDishEngine !== null || !tempDishDesc.trim()}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-[#d3a809]/20 hover:bg-[#d3a809]/30 border border-[#d3a809]/40 text-[#d3a809] rounded disabled:opacity-50 cursor-pointer"
                          >
                            {translatingDishEngine === 'gemini' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            <span>Gemini IA</span>
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={tempDishDesc}
                        onChange={(e) => setTempDishDesc(e.target.value)}
                        rows={2}
                        className="w-full mt-1 px-3 py-1.5 bg-black/60 border border-white/[0.15] rounded-lg text-xs text-white outline-none focus:border-[#d3a809] resize-none"
                      />
                    </div>

                    {/* EDITABLE ENGLISH SLOT */}
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-400 uppercase">
                        Slot de Tradução em Inglês (EN-US) — Editável Manualmente:
                      </label>
                      <textarea
                        value={tempDishDescEn}
                        onChange={(e) => setTempDishDescEn(e.target.value)}
                        rows={2}
                        className="w-full mt-1 px-3 py-1.5 bg-black/60 border border-white/[0.15] rounded-lg text-xs text-white outline-none focus:border-[#d3a809] resize-none italic"
                      />
                    </div>

                    {/* Structured tags in quick edit */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-neutral-400 uppercase">
                        Tags de Restrição:
                      </label>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {ALLOWED_DIETARY_TAGS.map((tag) => {
                          const isSel = tempDishTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleTempTag(tag)}
                              className={`px-2 py-1 rounded-md text-[10px] border transition-colors cursor-pointer ${
                                isSel
                                  ? 'bg-[#d3a809] text-neutral-950 font-bold border-[#d3a809]'
                                  : 'bg-black/40 text-neutral-400 border-white/[0.1]'
                              }`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingDishId(null)}
                        className="px-3 py-1 text-xs text-neutral-400 hover:text-white cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveDishEdit(dish.id)}
                        className="px-3.5 py-1 bg-[#d3a809] text-neutral-950 font-bold text-xs rounded-lg cursor-pointer"
                      >
                        Salvar no Evento
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-white font-display">
                          {dish.name}
                        </span>
                        {dish.highlight && (
                          <span className="text-[9px] text-[#d3a809] uppercase bg-[#d3a809]/10 border border-[#d3a809]/20 px-1.5 py-0.5 rounded font-semibold">
                            {dish.highlight}
                            {dish.highlightEn && (
                              <span className="text-neutral-400 font-normal ml-1">· EN: {dish.highlightEn}</span>
                            )}
                          </span>
                        )}
                        {!hasEnglishDesc && (
                          <span className="text-[10px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-400" />
                            Sem versão em inglês
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 line-clamp-1">
                        {dish.description}
                      </p>
                      {dish.descriptionEn && (
                        <p className="text-[11px] text-neutral-500 italic line-clamp-1">
                          EN: {dish.descriptionEn}
                        </p>
                      )}
                      <DietaryIcons tags={dish.dietary} />
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleStartEditDish(dish)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-[#d3a809]" />
                        Editar Rápido
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveDish(dish.id)}
                        className="p-1.5 text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Remover deste evento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 4: SOBREMESAS ATIVAS */}
      {formData.allowDessert && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-display">
              <Cake className="w-4 h-4 text-[#d3a809]" />
              Sobremesas Ativas ({formData.activeDesserts.length})
            </h2>
          </div>

          <div className="space-y-2.5">
            {formData.activeDesserts.map((dessert) => {
              const isEditing = editingDishId === dessert.id;
              const hasEnglishDesc = Boolean(dessert.descriptionEn && dessert.descriptionEn.trim());

              return (
                <div key={dessert.id} className="glass-card p-3.5 rounded-xl space-y-2">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-semibold text-neutral-400 uppercase">
                          Nome da Sobremesa (Único):
                        </label>
                        <input
                          type="text"
                          value={tempDishName}
                          onChange={(e) => setTempDishName(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 bg-black/60 border border-white/[0.15] rounded-lg text-xs text-white outline-none focus:border-[#d3a809]"
                        />
                      </div>

                      {/* DESTAQUE PT & EN IN QUICK EDIT */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-neutral-400 uppercase">
                            Destaque (PT-BR):
                          </label>
                          <input
                            type="text"
                            value={tempDishHighlight}
                            onChange={(e) => setTempDishHighlight(e.target.value)}
                            className="w-full mt-1 px-3 py-1.5 bg-black/60 border border-white/[0.15] rounded-lg text-xs text-white outline-none focus:border-[#d3a809]"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-neutral-400 uppercase">
                            Destaque (EN-US):
                          </label>
                          <input
                            type="text"
                            value={tempDishHighlightEn}
                            onChange={(e) => setTempDishHighlightEn(e.target.value)}
                            className="w-full mt-1 px-3 py-1.5 bg-black/60 border border-white/[0.15] rounded-lg text-xs text-white outline-none focus:border-[#d3a809] italic"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <label className="text-[11px] font-semibold text-neutral-400 uppercase">
                            Descrição (PT-BR):
                          </label>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleTranslateQuickDish('google')}
                              disabled={translatingDishEngine !== null || !tempDishDesc.trim()}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-200 rounded disabled:opacity-50 cursor-pointer"
                            >
                              {translatingDishEngine === 'google' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                              <span>Google</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTranslateQuickDish('gemini')}
                              disabled={translatingDishEngine !== null || !tempDishDesc.trim()}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-[#d3a809]/20 hover:bg-[#d3a809]/30 border border-[#d3a809]/40 text-[#d3a809] rounded disabled:opacity-50 cursor-pointer"
                            >
                              {translatingDishEngine === 'gemini' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                              <span>Gemini IA</span>
                            </button>
                          </div>
                        </div>
                        <textarea
                          value={tempDishDesc}
                          onChange={(e) => setTempDishDesc(e.target.value)}
                          rows={2}
                          className="w-full mt-1 px-3 py-1.5 bg-black/60 border border-white/[0.15] rounded-lg text-xs text-white outline-none focus:border-[#d3a809] resize-none"
                        />
                      </div>

                      {/* EDITABLE ENGLISH SLOT */}
                      <div>
                        <label className="text-[11px] font-semibold text-neutral-400 uppercase">
                          Slot de Tradução em Inglês (EN-US) — Editável Manualmente:
                        </label>
                        <textarea
                          value={tempDishDescEn}
                          onChange={(e) => setTempDishDescEn(e.target.value)}
                          rows={2}
                          className="w-full mt-1 px-3 py-1.5 bg-black/60 border border-white/[0.15] rounded-lg text-xs text-white outline-none focus:border-[#d3a809] resize-none italic"
                        />
                      </div>

                      {/* Structured tags in quick edit */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-neutral-400 uppercase">
                          Tags de Restrição:
                        </label>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {ALLOWED_DIETARY_TAGS.map((tag) => {
                            const isSel = tempDishTags.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTempTag(tag)}
                                className={`px-2 py-1 rounded-md text-[10px] border transition-colors cursor-pointer ${
                                  isSel
                                    ? 'bg-[#d3a809] text-neutral-950 font-bold border-[#d3a809]'
                                    : 'bg-black/40 text-neutral-400 border-white/[0.1]'
                                }`}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingDishId(null)}
                          className="px-3 py-1 text-xs text-neutral-400 hover:text-white cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveDishEdit(dessert.id)}
                          className="px-3.5 py-1 bg-[#d3a809] text-neutral-950 font-bold text-xs rounded-lg cursor-pointer"
                        >
                          Salvar no Evento
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-white font-display">
                            {dessert.name}
                          </span>
                          {dessert.highlight && (
                            <span className="text-[9px] text-[#d3a809] uppercase bg-[#d3a809]/10 border border-[#d3a809]/20 px-1.5 py-0.5 rounded font-semibold">
                              {dessert.highlight}
                              {dessert.highlightEn && (
                                <span className="text-neutral-400 font-normal ml-1">· EN: {dessert.highlightEn}</span>
                              )}
                            </span>
                          )}
                          {!hasEnglishDesc && (
                            <span className="text-[10px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-amber-400" />
                              Sem versão em inglês
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 line-clamp-1">
                          {dessert.description}
                        </p>
                        {dessert.descriptionEn && (
                          <p className="text-[11px] text-neutral-500 italic line-clamp-1">
                            EN: {dessert.descriptionEn}
                          </p>
                        )}
                        <DietaryIcons tags={dessert.dietary} />
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleStartEditDish(dessert)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#d3a809]" />
                          Editar Rápido
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveDessert(dessert.id)}
                          className="p-1.5 text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Remover deste evento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 5: REPOSITÓRIO GERAL DE EVENTOS (SEMANA ANTERIOR, ATUAL E PRÓXIMA) */}
      <section className="space-y-4 pt-4 border-t border-white/[0.08]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-[#d3a809]" />
              Repositório Geral de Eventos ({eventLibrary.length})
            </h3>
            <p className="text-xs text-neutral-400">
              Visualização temporal dos eventos cadastrados no hotel organizada por semanas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleCreateBlankEvent()}
            className="px-3.5 py-1.5 bg-[#d3a809] hover:bg-[#b89100] text-neutral-950 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
          >
            + Criar Novo Evento
          </button>
        </div>

        {/* WEEK FILTER TABS */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-black/40 border border-white/[0.08] rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setRepoWeekTab('current_week')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              repoWeekTab === 'current_week'
                ? 'bg-[#d3a809] text-neutral-950 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Semana Atual ({eventLibrary.filter((e) => getEventWeekBucket(e.date) === 'current_week').length})
          </button>

          <button
            type="button"
            onClick={() => setRepoWeekTab('next_week')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              repoWeekTab === 'next_week'
                ? 'bg-sky-500 text-neutral-950 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Próxima Semana ({eventLibrary.filter((e) => getEventWeekBucket(e.date) === 'next_week').length})
          </button>

          <button
            type="button"
            onClick={() => setRepoWeekTab('previous_week')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              repoWeekTab === 'previous_week'
                ? 'bg-neutral-200 text-neutral-950 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Semana Anterior ({eventLibrary.filter((e) => getEventWeekBucket(e.date) === 'previous_week').length})
          </button>

          <button
            type="button"
            onClick={() => setRepoWeekTab('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              repoWeekTab === 'all'
                ? 'bg-white/20 text-white font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Todos ({eventLibrary.length})
          </button>
        </div>

        {/* EVENTS LIST FILTERED BY WEEK */}
        {(() => {
          const filteredEvents =
            repoWeekTab === 'all'
              ? eventLibrary
              : eventLibrary.filter((e) => getEventWeekBucket(e.date) === repoWeekTab);

          if (filteredEvents.length === 0) {
            return (
              <div className="py-10 text-center glass-card rounded-2xl border border-dashed border-white/[0.1] text-xs text-neutral-400 space-y-2">
                <Calendar className="w-6 h-6 mx-auto text-neutral-500 stroke-[1.5]" />
                <p>Nenhum evento registrado para este período.</p>
                <button
                  type="button"
                  onClick={() => handleCreateBlankEvent()}
                  className="text-[#d3a809] hover:underline cursor-pointer"
                >
                  + Cadastrar evento agora
                </button>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredEvents.map((evt) => {
                const allocatedSlot = caixaSlots.find((s) => s.eventId === evt.id);
                const countdown = formatEventCountdown(evt.date);

                return (
                  <div
                    key={evt.id}
                    className={`rounded-2xl p-4 flex flex-col justify-between space-y-3 border transition-all ${
                      countdown.isPast
                        ? 'bg-neutral-900/60 border-neutral-700/80 opacity-75 grayscale contrast-125'
                        : 'glass-card'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        {allocatedSlot ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            Caixa #{allocatedSlot.slotNumber} ({allocatedSlot.slug})
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-500 bg-white/[0.04] px-2 py-0.5 rounded-full">
                            Não alocado
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                            countdown.badgeStyle === 'today'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                              : countdown.badgeStyle === 'upcoming'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                          }`}
                        >
                          <Clock className="w-2.5 h-2.5" />
                          {countdown.label}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white font-display line-clamp-1">
                        {evt.title}
                      </h4>
                      <div className="text-xs text-neutral-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#d3a809] shrink-0" />
                        <span className="truncate">{evt.location}</span>
                        <span>·</span>
                        <span>{evt.date}</span>
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {evt.totalReservations} reservas esperadas · Senha: <span className="font-mono text-neutral-300">{evt.accessCode}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectEvent(evt.id)}
                        className="text-xs text-[#d3a809] hover:underline font-medium cursor-pointer"
                      >
                        Editar Parâmetros
                      </button>

                      <select
                        value={allocatedSlot ? String(allocatedSlot.slotNumber) : ''}
                        onChange={(e) => {
                          const slotNum = parseInt(e.target.value, 10);
                          if (slotNum >= 1 && slotNum <= 4) {
                            onAllocateSlot(slotNum, evt.id);
                          }
                        }}
                        className="px-2 py-1 bg-black/60 border border-white/[0.15] rounded text-[10px] text-neutral-300 outline-none"
                      >
                        <option value="" disabled>
                          Alocar na Caixa...
                        </option>
                        <option value="1">Caixa #1 (eve1)</option>
                        <option value="2">Caixa #2 (eve2)</option>
                        <option value="3">Caixa #3 (eve3)</option>
                        <option value="4">Caixa #4 (eve4)</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </section>



      {/* MODAL DE IMPORTAÇÃO DO DB MESTRE */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#070926] border border-[#d3a809]/40 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  Puxar do Acervo Gastronômico Mestre
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-neutral-400 hover:text-white text-xs px-2 py-1 cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="space-y-2.5">
              {masterDatabase.map((masterItem) => (
                <div
                  key={masterItem.id}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <span className="text-[10px] text-[#d3a809] uppercase font-semibold">
                      {masterItem.category === 'main' ? 'Prato Principal' : 'Sobremesa'}
                    </span>
                    <div className="text-sm font-bold text-white font-display">
                      {masterItem.name}
                    </div>
                    {masterItem.highlight && (
                      <span className="text-[9px] text-[#d3a809] bg-[#d3a809]/10 px-1.5 py-0.5 rounded font-mono">
                        {masterItem.highlight}
                      </span>
                    )}
                    <p className="text-xs text-neutral-400 line-clamp-1">
                      {masterItem.description}
                    </p>
                    <DietaryIcons tags={masterItem.dietary} />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleImportFromDB(masterItem)}
                    className="px-3 py-1.5 bg-[#d3a809] text-neutral-950 font-bold text-xs rounded-lg hover:bg-[#e3b819] transition-colors shrink-0 cursor-pointer"
                  >
                    + Puxar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
