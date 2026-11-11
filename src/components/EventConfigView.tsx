import React, { useState, useEffect } from 'react';
import { EventConfig, MenuItem, HotelVenue, ALLOWED_DIETARY_TAGS } from '../types';
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
  currentEventId: string;
  onSelectEvent: (eventId: string) => void;
  onUpdateEventConfig: (newConfig: EventConfig) => void;
  onAddNewEvent: (newEvent: EventConfig) => void;
  masterDatabase: MenuItem[];
  onResetToDefault: () => void;
  onOpenGuestComanda: () => void;
}

export const EventConfigView: React.FC<EventConfigViewProps> = ({
  events,
  currentEventId,
  onSelectEvent,
  onUpdateEventConfig,
  onAddNewEvent,
  masterDatabase,
  onResetToDefault,
  onOpenGuestComanda,
}) => {
  const activeEvent = events.find((e) => e.id === currentEventId) || events[0];
  const [formData, setFormData] = useState<EventConfig>({ ...activeEvent });
  const [isSaved, setIsSaved] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [tempDishName, setTempDishName] = useState('');
  const [tempDishDesc, setTempDishDesc] = useState('');
  const [tempDishDescEn, setTempDishDescEn] = useState('');
  const [tempDishTags, setTempDishTags] = useState<string[]>([]);
  const [translatingDesc, setTranslatingDesc] = useState(false);
  const [translatingDish, setTranslatingDish] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Sync form data whenever the active event changes
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
    const updated = {
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

  const handleCopyDirectLink = () => {
    const slug = activeEvent.slug || activeEvent.id;
    const url = `${window.location.origin}${window.location.pathname}#/${slug}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleCreateNewEventSlot = () => {
    if (events.length >= 4) {
      alert('Máximo de 4 eventos simultâneos atingido.');
      return;
    }

    const nextIndex = events.length + 1;
    const defaultVenues: HotelVenue[] = ['Sala Pampulha', 'Sala Tiradentes', 'Restaurante', 'Espaço Panorâmico'];
    const assignedVenue = defaultVenues.find((v) => !events.some((e) => e.location === v)) || 'Sala Pampulha';
    const now = new Date();
    const isoDate = now.toISOString().split('T')[0];
    const defaultTitle = `Evento Executivo ${nextIndex}`;

    const newEvent: EventConfig = {
      id: `evt-raja-${Date.now()}`,
      slug: `eve${nextIndex}`,
      title: defaultTitle,
      subtitle: 'Almoço e Recepção Gastronômica BH Raja',
      subtitleEn: 'Gastronomic Luncheon & Reception at BH Raja',
      date: isoDate,
      time: '11h30 às 14h30',
      timeStart: '11:30',
      timeEnd: '14:30',
      location: assignedVenue,
      hotelName: 'BH Raja Hotel',
      hotelAddress: 'Av. Raja Gabaglia, 3950 — Belo Horizonte, MG',
      cnpj: '17.842.109/0001-94',
      accessCode: generateEventPassword(defaultTitle, isoDate),
      allowDessert: true,
      defaultBeverageIncluded: true,
      totalReservations: 50,
      coordinatorName: '',
      coordinatorPhone: '',
      welcomeMessage: 'Identifique-se para emitir sua comanda.',
      welcomeMessageEn: 'Please enter your name to issue your digital ticket.',
      activeDishes: masterDatabase.filter((m) => m.category === 'main').slice(0, 3),
      activeDesserts: masterDatabase.filter((m) => m.category === 'dessert').slice(0, 2),
    };

    onAddNewEvent(newEvent);
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
    <div className="w-full max-w-6xl mx-auto py-7 px-4 sm:px-6 space-y-6">
      {/* HEADER & MULTI-EVENT SELECTOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#d3a809] uppercase tracking-widest">
            <Settings className="w-4 h-4" />
            <span>Configuração dos Eventos ({events.length}/4)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-display mt-0.5">
            Parâmetros & Cardápio do Evento
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Copy Direct Link button */}
          <button
            type="button"
            onClick={handleCopyDirectLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-neutral-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            title="Copiar link direto para este evento (QR Code)"
          >
            {linkCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Link Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#d3a809]" />
                <span>Copiar Link QR</span>
              </>
            )}
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

      {/* EVENT SWITCHER TABS */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#d3a809]" />
            Selecione o Evento para Editar
          </span>
          {events.length < 4 && (
            <button
              type="button"
              onClick={handleCreateNewEventSlot}
              className="text-xs text-[#d3a809] hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              + Novo Evento Simultâneo
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {events.map((evt, idx) => {
            const isSelected = evt.id === activeEvent.id;
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
                  <span className="text-neutral-400 font-mono">{evt.slug || `eve${idx+1}`}</span>
                </div>
                <div className="text-xs font-bold text-white truncate font-display mt-0.5">
                  {evt.title}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1 truncate">
                  {evt.location} · {evt.accessCode}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. BASIC CONFIGURATION FORM */}
      <form onSubmit={handleSave} className="space-y-5 glass-panel p-5 sm:p-6 rounded-2xl">
        <h2 className="text-sm font-bold text-white tracking-wide border-b border-white/[0.08] pb-2 flex items-center gap-2 font-display">
          <Sparkles className="w-4 h-4 text-[#d3a809]" />
          1. Identificação, Calendário e Horários
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* TITLE (NUNCA TRADUZIDO) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider">
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
            {/* EDITABLE ENGLISH SLOT (AS REQUESTED) */}
            <div className="pt-1">
              <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Slot em Inglês (EN-US) — Editável Manualmente:
              </label>
              <input
                type="text"
                value={formData.subtitleEn || ''}
                onChange={(e) => setFormData({ ...formData, subtitleEn: e.target.value })}
                placeholder="English translation slot..."
                className="w-full mt-0.5 px-3 py-1.5 bg-black/40 border border-white/[0.1] rounded-lg text-xs text-white focus:border-[#d3a809] outline-none italic"
              />
            </div>
          </div>

          {/* DATE PICKER (CALENDÁRIO NATIVO COMO PEDIDO) */}
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
              placeholder="Ex: 1123@ALM"
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
              placeholder="Ex: Dra. Renata Silveira"
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
              placeholder="Digite 8 ou 9 dígitos (ex: 998723301)"
              className="w-full px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-xs text-white focus:border-[#d3a809] outline-none font-mono"
            />
            <span className="text-[10px] text-neutral-400">
              Auto: DDD 31 padrão, converte 8 dígitos para (31) 9 XXXX-XXXX.
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

      {/* 2. PRATOS PRINCIPAIS ATIVOS */}
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
                    {/* EDITABLE ENGLISH SLOT (MANUAL OR AI-GENERATED) */}
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-400 uppercase">
                        Slot de Tradução em Inglês (EN-US) — Editável Manualmente:
                      </label>
                      <textarea
                        value={tempDishDescEn}
                        onChange={(e) => setTempDishDescEn(e.target.value)}
                        rows={2}
                        placeholder="English description slot..."
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
                          <span className="text-[9px] text-[#d3a809] uppercase bg-[#d3a809]/10 border border-[#d3a809]/20 px-1.5 py-0.5 rounded">
                            {dish.highlight}
                          </span>
                        )}
                        {/* SMALL WARNING FOR DISHES WITHOUT ENGLISH DESCRIPTION (AS REQUESTED) */}
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

      {/* 3. SOBREMESAS ATIVAS */}
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
