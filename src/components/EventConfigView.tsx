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
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [createForSlotNumber, setCreateForSlotNumber] = useState<number | undefined>(undefined);

  // New Event Form State
  const [newEvtTitle, setNewEvtTitle] = useState('');
  const [newEvtSubtitle, setNewEvtSubtitle] = useState('');
  const [newEvtSubtitleEn, setNewEvtSubtitleEn] = useState('');
  const [newEvtVenue, setNewEvtVenue] = useState<HotelVenue>('Espaço Panorâmico');
  const [newEvtDate, setNewEvtDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEvtTimeStart, setNewEvtTimeStart] = useState('11:30');
  const [newEvtTimeEnd, setNewEvtTimeEnd] = useState('14:30');
  const [newEvtReservations, setNewEvtReservations] = useState(60);
  const [newEvtCoordinator, setNewEvtCoordinator] = useState('');
  const [newEvtPhone, setNewEvtPhone] = useState('');

  // Quick edit dish in active event
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [tempDishName, setTempDishName] = useState('');
  const [tempDishHighlight, setTempDishHighlight] = useState('');
  const [tempDishHighlightEn, setTempDishHighlightEn] = useState('');
  const [tempDishDesc, setTempDishDesc] = useState('');
  const [tempDishDescEn, setTempDishDescEn] = useState('');
  const [tempDishTags, setTempDishTags] = useState<string[]>([]);
  const [translatingDesc, setTranslatingDesc] = useState(false);
  const [translatingDish, setTranslatingDish] = useState(false);
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

  const handleTranslateEventDescription = async () => {
    if (!formData.subtitle.trim()) return;
    setTranslatingDesc(true);
    try {
      const translated = await translateTextWithAI(formData.subtitle, 'en', 'event_description');
      setFormData((prev) => ({ ...prev, subtitleEn: translated }));
    } finally {
      setTranslatingDesc(false);
    }
  };

  const handleTranslateQuickDish = async () => {
    if (!tempDishDesc.trim()) return;
    setTranslatingDish(true);
    try {
      const translated = await translateTextWithAI(tempDishDesc, 'en', 'dish');
      setTempDishDescEn(translated);
    } finally {
      setTranslatingDish(false);
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

  const handleOpenCreateEventModal = (slotNumber?: number) => {
    setCreateForSlotNumber(slotNumber);
    setNewEvtTitle('');
    setNewEvtSubtitle('');
    setNewEvtSubtitleEn('');
    setNewEvtVenue('Espaço Panorâmico');
    setNewEvtDate(new Date().toISOString().split('T')[0]);
    setNewEvtTimeStart('11:30');
    setNewEvtTimeEnd('14:30');
    setNewEvtReservations(50);
    setNewEvtCoordinator('');
    setNewEvtPhone('');
    setShowCreateEventModal(true);
  };

  const handleCreateEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvtTitle.trim()) return;

    const newId = `evt-${Date.now()}`;
    const generatedPwd = generateEventPassword(newEvtTitle.trim(), newEvtDate);
    const formattedTime = formatTimeRangeExtenso(newEvtTimeStart, newEvtTimeEnd, 'pt');

    const defaultDishes = masterDatabase.filter((m) => m.category === 'main').slice(0, 3);
    const defaultDesserts = masterDatabase.filter((m) => m.category === 'dessert').slice(0, 2);

    const newEvent: EventConfig = {
      id: newId,
      slug: createForSlotNumber ? `eve${createForSlotNumber}` : `eve-${Date.now().toString().slice(-4)}`,
      title: newEvtTitle.trim(),
      subtitle: newEvtSubtitle.trim() || 'Almoço Gastronômico BH Raja Hotel',
      subtitleEn: newEvtSubtitleEn.trim() || undefined,
      date: newEvtDate,
      time: formattedTime,
      timeStart: newEvtTimeStart,
      timeEnd: newEvtTimeEnd,
      location: newEvtVenue,
      hotelName: HOTEL_INFO.name,
      hotelAddress: HOTEL_INFO.address,
      cnpj: HOTEL_INFO.cnpj,
      accessCode: generatedPwd,
      allowDessert: true,
      defaultBeverageIncluded: true,
      totalReservations: newEvtReservations,
      coordinatorName: newEvtCoordinator.trim() || undefined,
      coordinatorPhone: newEvtPhone.trim() ? formatBrazilianPhone(newEvtPhone) : undefined,
      welcomeMessage: 'Identifique-se para emitir sua comanda.',
      welcomeMessageEn: 'Please enter your name to issue your digital ticket.',
      activeDishes: defaultDishes,
      activeDesserts: defaultDesserts,
    };

    onCreateNewEventInLibrary(newEvent, createForSlotNumber);
    setShowCreateEventModal(false);
    onSelectEvent(newEvent.id);
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
            Caixas de Eventos Simultâneos & Parâmetros
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenCreateEventModal()}
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

      {/* SECTION 1: AS 4 CAIXAS DE EVENTOS SIMULTÂNEOS (#1, #2, #3, #4) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#d3a809] flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#d3a809]" />
            Caixas de Eventos Simultâneos (Fluxo de Alocação #1 a #4)
          </span>
          <span className="text-[11px] text-neutral-400">
            Alocação direta para os links QR dos convidados
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {caixaSlots.map((slot) => {
            const allocatedEvent = slot.eventId
              ? eventLibrary.find((e) => e.id === slot.eventId) || events.find((e) => e.id === slot.eventId)
              : null;
            const isEditingThis = allocatedEvent?.id === activeEvent?.id;

            return (
              <div
                key={slot.slotKey}
                className={`rounded-2xl p-4 flex flex-col justify-between border transition-all ${
                  allocatedEvent
                    ? isEditingThis
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
                    <div className="py-4 text-center space-y-2">
                      <div className="text-xs text-neutral-400">Caixa Vazia</div>
                      <div className="flex flex-col gap-1.5 pt-1">
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value === '__new__') {
                              handleOpenCreateEventModal(slot.slotNumber);
                            } else if (e.target.value) {
                              onAllocateSlot(slot.slotNumber, e.target.value);
                            }
                          }}
                          className="w-full px-2 py-1 bg-black/60 border border-white/[0.15] rounded text-[11px] text-neutral-200 outline-none focus:border-[#d3a809]"
                        >
                          <option value="" disabled>
                            Alocar evento...
                          </option>
                          {eventLibrary.map((libEvt) => (
                            <option key={libEvt.id} value={libEvt.id}>
                              {libEvt.title}
                            </option>
                          ))}
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
      <form onSubmit={handleSave} className="space-y-5 glass-panel p-5 sm:p-6 rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
          <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2 font-display">
            <Sparkles className="w-4 h-4 text-[#d3a809]" />
            Parâmetros do Evento: <span className="text-[#d3a809]">{formData.title}</span>
          </h2>
          <span className="text-xs text-neutral-400 font-mono">ID: {formData.id}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* TITLE (NUNCA TRADUZIDO) */}
          <div className="space-y-1">
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

          {/* SUBTITLE (SLOT PT-BR E SLOT EN-US EDITÁVEL) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider">
                Subtítulo / Descrição (PT-BR)
              </label>
              <button
                type="button"
                onClick={handleTranslateEventDescription}
                disabled={translatingDesc || !formData.subtitle.trim()}
                className="inline-flex items-center gap-1 text-[11px] text-[#d3a809] hover:underline disabled:opacity-50 transition-colors cursor-pointer"
              >
                {translatingDesc ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Languages className="w-3 h-3" />
                )}
                <span>Traduzir com IA</span>
              </button>
            </div>
            <input
              type="text"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-xs text-white focus:border-[#d3a809] outline-none"
            />
            <div className="pt-1">
              <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Slot em Inglês (EN-US) — Editável Manualmente:
              </label>
              <input
                type="text"
                value={formData.subtitleEn || ''}
                onChange={(e) => setFormData({ ...formData, subtitleEn: e.target.value })}
                className="w-full mt-0.5 px-3 py-1.5 bg-black/40 border border-white/[0.1] rounded-lg text-xs text-white focus:border-[#d3a809] outline-none italic"
              />
            </div>
          </div>

          {/* DATE PICKER (CALENDÁRIO NATIVO) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#d3a809]" />
              Data do Evento (Calendário) *
            </label>
            <input
              type="date"
              value={formData.date || ''}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-xs text-white focus:border-[#d3a809] outline-none font-mono"
              required
            />
            <span className="text-[10px] text-neutral-400">
              Na comanda aparecerá: <strong className="text-white">{formatDateFullExtenso(formData.date, 'pt')}</strong>
            </span>
          </div>

          {/* TIME: 2 RELOGINHOS (START E END) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#d3a809]" />
              Horário do Almoço (2 Reloginhos: Início e Término) *
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
            <span className="text-[10px] text-neutral-400">
              Na comanda aparecerá: <strong className="text-white">{formatTimeRangeExtenso(formData.timeStart, formData.timeEnd, 'pt')}</strong>
            </span>
          </div>

          {/* VENUE SELECTION */}
          <div className="space-y-1">
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

          {/* ACCESS CODE WITHOUT SLASHES */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-[#d3a809]" />
                Senha de Acesso (Sem Barras: MMDD@XXX) *
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-[10px] text-[#d3a809] hover:underline cursor-pointer"
              >
                Gerar Senha Padrão
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
              Total de Reservas Feitas / Esperadas *
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
              Responsável pelo Evento (Apenas Maître)
            </label>
            <input
              type="text"
              value={formData.coordinatorName || ''}
              onChange={(e) => setFormData({ ...formData, coordinatorName: e.target.value })}
              className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-xs text-white focus:border-[#d3a809] outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1">
              <Phone className="w-3 h-3 text-[#d3a809]" />
              Telefone (DDD 31 Automático)
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

        {/* SOBREMESA TOGGLE */}
        <div className="pt-3 border-t border-white/[0.08]">
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
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-neutral-400 uppercase">
                          Descrição (PT-BR):
                        </label>
                        <button
                          type="button"
                          onClick={handleTranslateQuickDish}
                          disabled={translatingDish || !tempDishDesc.trim()}
                          className="inline-flex items-center gap-1 text-[11px] text-[#d3a809] hover:underline disabled:opacity-50 cursor-pointer"
                        >
                          {translatingDish ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                          <span>Traduzir com IA</span>
                        </button>
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
              const hasEn = Boolean(dessert.descriptionEn && dessert.descriptionEn.trim());
              return (
                <div
                  key={dessert.id}
                  className="glass-card p-3.5 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold text-white font-display">
                        {dessert.name}
                      </div>
                      {dessert.highlight && (
                        <span className="text-[9px] text-[#d3a809] uppercase bg-[#d3a809]/10 border border-[#d3a809]/20 px-1.5 py-0.5 rounded font-semibold">
                          {dessert.highlight}
                        </span>
                      )}
                      {!hasEn && (
                        <span className="text-[10px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-400" />
                          Sem versão em inglês
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 line-clamp-1">
                      {dessert.description}
                    </p>
                    <DietaryIcons tags={dessert.dietary} />
                  </div>

                  <div className="flex items-center gap-2">
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
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 5: REPOSITÓRIO GERAL DE EVENTOS CADASTRADOS */}
      <section className="space-y-3 pt-4 border-t border-white/[0.08]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-[#d3a809]" />
              Repositório Geral de Eventos ({eventLibrary.length})
            </h3>
            <p className="text-xs text-neutral-400">
              Todos os eventos criados no sistema. Aloque qualquer um nas Caixas #1 a #4.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenCreateEventModal()}
            className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-semibold rounded-lg text-white transition-colors cursor-pointer"
          >
            + Criar Evento
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {eventLibrary.map((evt) => {
            const allocatedSlot = caixaSlots.find((s) => s.eventId === evt.id);
            return (
              <div
                key={evt.id}
                className="glass-card rounded-2xl p-4 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    {allocatedSlot ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Alocado na Caixa #{allocatedSlot.slotNumber}
                      </span>
                    ) : (
                      <span className="text-[10px] text-neutral-500 bg-white/[0.04] px-2 py-0.5 rounded-full">
                        Não alocado
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-neutral-400">{evt.accessCode}</span>
                  </div>

                  <h4 className="text-sm font-bold text-white font-display">{evt.title}</h4>
                  <div className="text-xs text-neutral-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#d3a809]" />
                    <span>{evt.location}</span> · <span>{evt.date}</span>
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
      </section>

      {/* MODAL CRIAR NOVO EVENTO */}
      {showCreateEventModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateEventSubmit}
            className="glass-panel border border-[#d3a809]/30 w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#d3a809]" />
                  Cadastrar Novo Evento no Repositório
                </h3>
                {createForSlotNumber && (
                  <p className="text-[11px] text-[#d3a809]">
                    Será alocado automaticamente na Caixa #{createForSlotNumber} (eve{createForSlotNumber})
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowCreateEventModal(false)}
                className="text-neutral-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px] block mb-1">
                  Título do Evento *
                </label>
                <input
                  type="text"
                  value={newEvtTitle}
                  onChange={(e) => setNewEvtTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809]"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px] block mb-1">
                  Subtítulo / Descrição (PT-BR)
                </label>
                <input
                  type="text"
                  value={newEvtSubtitle}
                  onChange={(e) => setNewEvtSubtitle(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809]"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px] block mb-1">
                  Slot em Inglês (EN-US) — Opcional
                </label>
                <input
                  type="text"
                  value={newEvtSubtitleEn}
                  onChange={(e) => setNewEvtSubtitleEn(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809] italic"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px] block mb-1">
                    Espaço
                  </label>
                  <select
                    value={newEvtVenue}
                    onChange={(e) => setNewEvtVenue(e.target.value as HotelVenue)}
                    className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809]"
                  >
                    {HOTEL_INFO.venues.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px] block mb-1">
                    Data (Calendário) *
                  </label>
                  <input
                    type="date"
                    value={newEvtDate}
                    onChange={(e) => setNewEvtDate(e.target.value)}
                    className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809] font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px] block mb-1">
                    Início Almoço:
                  </label>
                  <input
                    type="time"
                    value={newEvtTimeStart}
                    onChange={(e) => setNewEvtTimeStart(e.target.value)}
                    className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809] font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px] block mb-1">
                    Término Almoço:
                  </label>
                  <input
                    type="time"
                    value={newEvtTimeEnd}
                    onChange={(e) => setNewEvtTimeEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px] block mb-1">
                    Total de Reservas *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={newEvtReservations}
                    onChange={(e) => setNewEvtReservations(parseInt(e.target.value, 10) || 50)}
                    className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809] font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px] block mb-1">
                    Responsável (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newEvtCoordinator}
                    onChange={(e) => setNewEvtCoordinator(e.target.value)}
                    className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateEventModal(false)}
                className="px-4 py-2 text-xs text-neutral-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#d3a809] hover:bg-[#b89100] text-neutral-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
              >
                Salvar Evento
              </button>
            </div>
          </form>
        </div>
      )}

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
