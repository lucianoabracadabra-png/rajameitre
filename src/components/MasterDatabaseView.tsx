import React, { useState } from 'react';
import { MenuItem, DishCategory, ALLOWED_DIETARY_TAGS } from '../types';
import {
  Database,
  Plus,
  Trash2,
  Sparkles,
  Check,
  Languages,
  Loader2,
  AlertCircle,
  Tag,
  X,
} from 'lucide-react';
import { DietaryIcons } from './DietaryIcons';
import { translateTextWithAI } from '../lib/api';

interface MasterDatabaseViewProps {
  masterDatabase: MenuItem[];
  onUpdateMasterDatabase: (updatedDB: MenuItem[]) => void;
  onOpenGuestComanda: () => void;
}

export const MasterDatabaseView: React.FC<MasterDatabaseViewProps> = ({
  masterDatabase,
  onUpdateMasterDatabase,
}) => {
  const [activeCategory, setActiveCategory] = useState<DishCategory | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New item form state (SINGLE NAME, NO FRENCH TITLE)
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<DishCategory>('main');
  const [newDescription, setNewDescription] = useState('');
  const [newDescriptionEn, setNewDescriptionEn] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Sem glúten', 'Sem Lactose']);
  const [newHighlight, setNewHighlight] = useState('');
  const [newHighlightEn, setNewHighlightEn] = useState('');
  const [translating, setTranslating] = useState(false);

  // Quick edit state for Destaque
  const [quickEditingHighlightId, setQuickEditingHighlightId] = useState<string | null>(null);
  const [quickHighlightPt, setQuickHighlightPt] = useState('');
  const [quickHighlightEn, setQuickHighlightEn] = useState('');

  const filteredItems = masterDatabase.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleTranslateDescription = async () => {
    if (!newDescription.trim()) return;
    setTranslating(true);
    try {
      const translated = await translateTextWithAI(newDescription.trim(), 'en', 'dish');
      setNewDescriptionEn(translated);
    } finally {
      setTranslating(false);
    }
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newItem: MenuItem = {
      id: `master-${Date.now()}`,
      category: newCategory,
      name: newName.trim(), // Somente um único nome
      description: newDescription.trim() || 'Criação gastronômica BH Raja Hotel.',
      descriptionEn: newDescriptionEn.trim() || undefined,
      dietary: [...selectedTags],
      highlight: newHighlight.trim() || undefined,
      highlightEn: newHighlightEn.trim() || undefined,
    };

    const updated = [...masterDatabase, newItem];
    onUpdateMasterDatabase(updated);

    // Reset form
    setNewName('');
    setNewDescription('');
    setNewDescriptionEn('');
    setSelectedTags(['Sem glúten', 'Sem Lactose']);
    setNewHighlight('');
    setNewHighlightEn('');
    setShowAddModal(false);
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm('Remover esta criação do Acervo Mestre Permanente?')) {
      const updated = masterDatabase.filter((item) => item.id !== id);
      onUpdateMasterDatabase(updated);
    }
  };

  const handleStartQuickHighlight = (item: MenuItem) => {
    setQuickEditingHighlightId(item.id);
    setQuickHighlightPt(item.highlight || '');
    setQuickHighlightEn(item.highlightEn || '');
  };

  const handleSaveQuickHighlight = (itemId: string) => {
    const updated = masterDatabase.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          highlight: quickHighlightPt.trim() || undefined,
          highlightEn: quickHighlightEn.trim() || undefined,
        };
      }
      return item;
    });

    onUpdateMasterDatabase(updated);
    setQuickEditingHighlightId(null);
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-7 px-4 sm:px-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#d3a809] uppercase tracking-widest">
            <Database className="w-4 h-4" />
            <span>BH Raja Hotel · Catálogo Canônico</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-display mt-0.5">
            Acervo Gastronômico Mestre
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#d3a809] hover:bg-[#b89100] text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-md cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            + Nova Criação
          </button>
        </div>
      </div>

      {/* CATEGORY FILTER TABS */}
      <div className="flex items-center gap-2 p-1 bg-black/40 rounded-xl border border-white/[0.08] self-start w-fit text-xs">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
            activeCategory === 'all'
              ? 'bg-[#d3a809] text-neutral-950 font-bold shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Todos ({masterDatabase.length})
        </button>
        <button
          onClick={() => setActiveCategory('main')}
          className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
            activeCategory === 'main'
              ? 'bg-[#d3a809] text-neutral-950 font-bold shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Pratos Principais
        </button>
        <button
          onClick={() => setActiveCategory('dessert')}
          className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
            activeCategory === 'dessert'
              ? 'bg-[#d3a809] text-neutral-950 font-bold shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Sobremesas
        </button>
      </div>

      {/* ITEMS LIST (SINGLE DISH NAME ONLY + ALERT FOR MISSING EN + QUICK HIGHLIGHT EDIT) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const hasEnglishDesc = Boolean(item.descriptionEn && item.descriptionEn.trim());
          const isQuickEditing = quickEditingHighlightId === item.id;

          return (
            <div
              key={item.id}
              className="glass-card rounded-2xl p-4.5 flex flex-col justify-between hover:border-[#d3a809]/40 transition-all shadow-lg space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#d3a809] tracking-wider">
                    {item.category === 'main' ? 'Prato Principal' : 'Sobremesa'}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {item.id}
                  </span>
                </div>

                {/* ONLY ONE NAME */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-white font-display">
                    {item.name}
                  </h3>
                </div>

                {/* DESTAQUE DISPLAY & QUICK EDIT */}
                {isQuickEditing ? (
                  <div className="p-2.5 rounded-xl bg-black/60 border border-[#d3a809]/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-300 text-[11px] flex items-center gap-1">
                        <Tag className="w-3 h-3 text-[#d3a809]" />
                        Editar Destaque Rápido
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuickEditingHighlightId(null)}
                        className="text-neutral-500 hover:text-white p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    <div>
                      <span className="text-[10px] text-neutral-400 block mb-0.5">Destaque (PT-BR):</span>
                      <input
                        type="text"
                        value={quickHighlightPt}
                        onChange={(e) => setQuickHighlightPt(e.target.value)}
                        className="w-full px-2.5 py-1 bg-black/70 border border-white/[0.15] rounded text-white text-xs outline-none focus:border-[#d3a809]"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-neutral-400 block mb-0.5">Destaque (EN-US):</span>
                      <input
                        type="text"
                        value={quickHighlightEn}
                        onChange={(e) => setQuickHighlightEn(e.target.value)}
                        className="w-full px-2.5 py-1 bg-black/70 border border-white/[0.15] rounded text-white text-xs outline-none focus:border-[#d3a809]"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setQuickHighlightPt('');
                          setQuickHighlightEn('');
                        }}
                        className="px-2 py-0.5 text-rose-300 hover:text-rose-200 text-xs"
                      >
                        Limpar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveQuickHighlight(item.id)}
                        className="px-3 py-1 bg-[#d3a809] hover:bg-[#b89100] text-neutral-950 font-bold text-xs rounded transition-colors"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] py-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.highlight ? (
                        <span className="text-[10px] font-semibold text-[#d3a809] bg-[#d3a809]/10 border border-[#d3a809]/20 px-2 py-0.5 rounded">
                          {item.highlight}
                          {item.highlightEn && (
                            <span className="text-neutral-400 font-normal ml-1">· EN: {item.highlightEn}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-500 italic">Sem destaque</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartQuickHighlight(item)}
                      className="text-[10px] text-[#d3a809] hover:underline font-medium cursor-pointer"
                    >
                      {item.highlight ? 'Editar Destaque' : '+ Destaque'}
                    </button>
                  </div>
                )}

                {/* SMALL ALERT FOR DISHES WITHOUT ENGLISH DESCRIPTION */}
                {!hasEnglishDesc && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-medium">
                    <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Sem versão em inglês</span>
                  </div>
                )}

                <p className="text-xs text-neutral-300 leading-relaxed font-light">
                  {item.description}
                </p>

                {item.descriptionEn && (
                  <p className="text-[11px] text-neutral-400 italic font-light pt-0.5 border-t border-white/[0.05]">
                    <span className="text-[#d3a809] font-medium not-italic">EN: </span>
                    {item.descriptionEn}
                  </p>
                )}

                <div className="pt-1">
                  <DietaryIcons tags={item.dietary} />
                </div>
              </div>

              <div className="pt-2.5 border-t border-white/[0.08] flex items-center justify-end text-xs">
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-neutral-500 hover:text-rose-400 transition-colors p-1 cursor-pointer flex items-center gap-1 text-[11px]"
                  title="Remover do Acervo Mestre"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD MODAL WITH STRUCTURED DIETARY TAGS, GEMINI TRANSLATION & MANUAL EN HIGHLIGHT */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleAddNewItem}
            className="glass-panel border border-[#d3a809]/30 w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#d3a809]" />
                  Cadastrar Prato no Acervo Mestre
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-white text-xs px-2 py-1 cursor-pointer"
              >
                ✕ Cancelar
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
                  Categoria *
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as DishCategory)}
                  className="w-full mt-1 px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809]"
                >
                  <option value="main">Prato Principal</option>
                  <option value="dessert">Sobremesa</option>
                </select>
              </div>

              {/* SINGLE NAME ONLY (NO FRENCH TITLE) */}
              <div>
                <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
                  Nome do Prato (Único) *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809] font-medium"
                  required
                />
              </div>

              {/* DESTAQUE PT-BR E SLOT MANUAL EN-US */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
                    Destaque (PT-BR)
                  </label>
                  <input
                    type="text"
                    value={newHighlight}
                    onChange={(e) => setNewHighlight(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
                    Destaque (EN-US) — Slot Manual
                  </label>
                  <input
                    type="text"
                    value={newHighlightEn}
                    onChange={(e) => setNewHighlightEn(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809] italic"
                  />
                </div>
              </div>

              {/* DESCRIPTION & GEMINI AI TRANSLATION */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
                    Descrição Gastronômica (PT-BR) *
                  </label>
                  <button
                    type="button"
                    onClick={handleTranslateDescription}
                    disabled={translating || !newDescription.trim()}
                    className="inline-flex items-center gap-1.5 text-[11px] text-[#d3a809] hover:underline disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    {translating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Languages className="w-3.5 h-3.5" />
                    )}
                    <span>Traduzir com IA (EN-US)</span>
                  </button>
                </div>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  className="w-full mt-1 px-3.5 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809] resize-none"
                  required
                />
              </div>

              {/* ENGLISH TRANSLATION SLOT (EDITABLE BY USER) */}
              <div>
                <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
                  Slot de Descrição em Inglês (EN-US) — Editável Manualmente:
                </label>
                <textarea
                  value={newDescriptionEn}
                  onChange={(e) => setNewDescriptionEn(e.target.value)}
                  rows={2}
                  className="w-full mt-1 px-3.5 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809] resize-none italic"
                />
              </div>

              {/* STRUCTURED DIETARY TAGS BUTTONS */}
              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px] block">
                  Restrições Alimentares (Selecione as Tags Aplicáveis)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-0.5">
                  {ALLOWED_DIETARY_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#d3a809]/20 border-[#d3a809] text-white shadow-sm'
                            : 'bg-black/30 border-white/[0.08] text-neutral-400 hover:text-white hover:border-white/[0.2]'
                        }`}
                      >
                        <span>{tag}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#d3a809] stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs text-neutral-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#d3a809] hover:bg-[#b89100] text-neutral-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
              >
                Salvar no Acervo Mestre
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
