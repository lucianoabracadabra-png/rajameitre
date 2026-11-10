import React, { useState } from 'react';
import { EventConfig, MenuItem, HotelVenue } from '../types';
import {
  Settings,
  Plus,
  Trash2,
  Edit2,
  Database,
  RotateCcw,
  Check,
  Sparkles,
  Utensils,
  Cake,
  ExternalLink,
  MapPin,
} from 'lucide-react';
import { DietaryIcons } from './DietaryIcons';
import { HOTEL_INFO } from '../data/menuDatabase';

interface EventConfigViewProps {
  eventConfig: EventConfig;
  onUpdateEventConfig: (newConfig: EventConfig) => void;
  masterDatabase: MenuItem[];
  onResetToDefault: () => void;
  onOpenGuestComanda: () => void;
}

export const EventConfigView: React.FC<EventConfigViewProps> = ({
  eventConfig,
  onUpdateEventConfig,
  masterDatabase,
  onResetToDefault,
  onOpenGuestComanda,
}) => {
  const [formData, setFormData] = useState<EventConfig>({ ...eventConfig });
  const [isSaved, setIsSaved] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [tempDishName, setTempDishName] = useState('');
  const [tempDishDesc, setTempDishDesc] = useState('');

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onUpdateEventConfig(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
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
  };

  const handleSaveDishEdit = (dishId: string) => {
    const updatedDishes = formData.activeDishes.map((d) => {
      if (d.id === dishId) {
        return {
          ...d,
          name: tempDishName,
          description: tempDishDesc,
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

    let updatedDishes = [...formData.activeDishes];
    let updatedDesserts = [...formData.activeDesserts];

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
    <div className="w-full max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#d3a809] uppercase tracking-widest">
            <Settings className="w-4 h-4" />
            <span>Configuração do Evento Ativo</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-1 font-display">
            Parâmetros do Evento & Cardápio
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Defina o ambiente no BH Raja Hotel e personalize os pratos para o almoço de hoje.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenGuestComanda}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#d3a809]" />
            Ver Comanda Convidado
          </button>

          <button
            type="button"
            onClick={onResetToDefault}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-black/40 hover:bg-black/60 border border-white/[0.1] text-neutral-300 text-xs rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
            Restaurar do DB
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-[#d3a809] to-[#b38b00] hover:from-[#e3b819] hover:to-[#c49800] text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-md cursor-pointer active:scale-95"
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4 text-neutral-950" />
                Salvo!
              </>
            ) : (
              'Salvar Alterações'
            )}
          </button>
        </div>
      </div>

      {/* CLARITY BANNER */}
      <div className="p-4 rounded-xl bg-[#d3a809]/10 border border-[#d3a809]/20 text-neutral-200 text-xs flex items-start gap-3">
        <Database className="w-5 h-5 text-[#d3a809] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-semibold text-[#d3a809]">
            Edição Isolada de Cardápio Ativo
          </div>
          <div className="text-neutral-300">
            Qualquer alteração feita nesta tela afeta exclusivamente a comanda deste evento. O Acervo Gastronômico Mestre permanente permanece protegido contra alterações.
          </div>
        </div>
      </div>

      {/* 1. CONFIGURAÇÃO BÁSICA DO EVENTO */}
      <form onSubmit={handleSave} className="space-y-6 glass-panel p-6 sm:p-8 rounded-2xl">
        <h2 className="text-base font-bold text-white tracking-wide border-b border-white/[0.08] pb-2.5 flex items-center gap-2 font-display">
          <Sparkles className="w-4 h-4 text-[#d3a809]" />
          1. Local, Data e Senha no BH Raja Hotel
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              Título do Evento *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.1] rounded-xl text-xs text-white focus:border-[#d3a809] outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              Subtítulo do Evento
            </label>
            <input
              type="text"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.1] rounded-xl text-xs text-white focus:border-[#d3a809] outline-none"
            />
          </div>

          {/* VENUE SELECTION: STRICTLY SALA PAMPULHA, SALA TIRADENTES OR RESTAURANTE */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#d3a809]" />
              Espaço no BH Raja Hotel *
            </label>
            <div className="grid grid-cols-3 gap-2 pt-0.5">
              {HOTEL_INFO.venues.map((venue) => {
                const isSelected = formData.location === venue;
                return (
                  <button
                    key={venue}
                    type="button"
                    onClick={() => setFormData({ ...formData, location: venue })}
                    className={`py-2.5 px-2 text-xs font-medium rounded-xl border text-center transition-all cursor-pointer ${
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

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              Senha de Acesso dos Convidados *
            </label>
            <input
              type="text"
              value={formData.accessCode}
              onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.1] rounded-xl text-xs text-white font-mono focus:border-[#d3a809] outline-none uppercase tracking-wider"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              Data do Evento
            </label>
            <input
              type="text"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.1] rounded-xl text-xs text-white focus:border-[#d3a809] outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              Horário do Almoço
            </label>
            <input
              type="text"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.1] rounded-xl text-xs text-white focus:border-[#d3a809] outline-none"
            />
          </div>
        </div>

        {/* SOBREMESA TOGGLE (SOBREMESA OU NÃO É UMA CONFIGURAÇÃO DO EVENTO) */}
        <div className="pt-4 border-t border-white/[0.08]">
          <label className="flex items-center gap-3.5 p-4 rounded-xl bg-black/30 border border-white/[0.08] cursor-pointer hover:border-white/[0.15] transition-colors">
            <input
              type="checkbox"
              checked={formData.allowDessert}
              onChange={(e) => setFormData({ ...formData, allowDessert: e.target.checked })}
              className="w-4 h-4 accent-[#d3a809] cursor-pointer"
            />
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2 font-display">
                <Cake className="w-4 h-4 text-[#d3a809]" />
                Incluir Escolha de Sobremesas para os Convidados
              </div>
              <div className="text-xs text-neutral-400 mt-0.5">
                {formData.allowDessert
                  ? 'Ativado: O convidado escolherá prato principal e sobremesa.'
                  : 'Desativado: O evento servirá apenas prato principal e café.'}
              </div>
            </div>
          </label>
        </div>
      </form>

      {/* 2. PRATOS PRINCIPAIS ATIVOS */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-display">
              <Utensils className="w-4 h-4 text-[#d3a809]" />
              Pratos Principais Ativos para Hoje ({formData.activeDishes.length})
            </h2>
            <p className="text-xs text-neutral-400">
              Edição rápida de nomes e guarnições apenas para este almoço.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-[#d3a809] text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            + Puxar do Acervo Mestre (DB)
          </button>
        </div>

        <div className="space-y-3">
          {formData.activeDishes.map((dish) => {
            const isEditing = editingDishId === dish.id;

            return (
              <div
                key={dish.id}
                className="glass-card p-4 rounded-xl space-y-2"
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-400 uppercase">
                        Nome para o evento:
                      </label>
                      <input
                        type="text"
                        value={tempDishName}
                        onChange={(e) => setTempDishName(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 bg-black/60 border border-white/[0.15] rounded-lg text-xs text-white outline-none focus:border-[#d3a809]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-400 uppercase">
                        Descrição / Guarnições de hoje:
                      </label>
                      <textarea
                        value={tempDishDesc}
                        onChange={(e) => setTempDishDesc(e.target.value)}
                        rows={2}
                        className="w-full mt-1 px-3 py-1.5 bg-black/60 border border-white/[0.15] rounded-lg text-xs text-white outline-none focus:border-[#d3a809] resize-none"
                      />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingDishId(null)}
                        className="px-3 py-1 text-xs text-neutral-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveDishEdit(dish.id)}
                        className="px-3.5 py-1 bg-[#d3a809] text-neutral-950 font-bold text-xs rounded-lg"
                      >
                        Salvar Neste Evento
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white font-display">
                          {dish.name}
                        </span>
                        {dish.frenchTitle && (
                          <span className="text-xs text-neutral-400 hidden sm:inline">
                            · {dish.frenchTitle}
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
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-display">
                <Cake className="w-4 h-4 text-[#d3a809]" />
                Sobremesas Ativas para Hoje ({formData.activeDesserts.length})
              </h2>
              <p className="text-xs text-neutral-400">
                Opções disponíveis para o convidado escolher.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {formData.activeDesserts.map((dessert) => (
              <div
                key={dessert.id}
                className="glass-card p-4 rounded-xl flex items-center justify-between gap-3"
              >
                <div className="space-y-1 flex-1">
                  <div className="text-sm font-bold text-white font-display">
                    {dessert.name}
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
            ))}
          </div>
        </section>
      )}

      {/* MODAL DE IMPORTAÇÃO DO DB MESTRE */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#070926] border border-[#d3a809]/40 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-lg font-bold text-white font-display">
                  Puxar do Acervo Gastronômico Mestre (DB)
                </h3>
                <p className="text-xs text-neutral-400">
                  Cria uma cópia isolada para este evento sem alterar o cadastro permanente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-neutral-400 hover:text-white text-xs px-2 py-1"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="space-y-3">
              {masterDatabase.map((masterItem) => (
                <div
                  key={masterItem.id}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between gap-3"
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
                    className="px-3.5 py-1.5 bg-[#d3a809] text-neutral-950 font-bold text-xs rounded-lg hover:bg-[#e3b819] transition-colors shrink-0 cursor-pointer"
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
