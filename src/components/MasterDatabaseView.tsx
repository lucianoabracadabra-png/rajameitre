import React, { useState } from 'react';
import { MenuItem, DishCategory, ALLOWED_DIETARY_TAGS } from '../types';
import {
  Database,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
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

  // New item form state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<DishCategory>('main');
  const [newDescription, setNewDescription] = useState('');
  const [newDescriptionEn, setNewDescriptionEn] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Sem glúten', 'Sem Lactose']);
  const [newHighlight, setNewHighlight] = useState('');
  const [newHighlightEn, setNewHighlightEn] = useState('');
  const [translatingEngine, setTranslatingEngine] = useState<'google' | 'gemini' | null>(null);

  // Full item editing state (replaces the old inline highlight edit)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<DishCategory>('main');
  const [editDescription, setEditDescription] = useState('');
  const [editDescriptionEn, setEditDescriptionEn] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editHighlight, setEditHighlight] = useState('');
  const [editHighlightEn, setEditHighlightEn] = useState('');
  const [translatingEditEngine, setTranslatingEditEngine] = useState<'google' | 'gemini' | null>(null);

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

  const toggleEditTag = (tag: string) => {
    if (editTags.includes(tag)) {
      setEditTags(editTags.filter((t) => t !== tag));
    } else {
      setEditTags([...editTags, tag]);
    }
  };

  const handleTranslateNew = async (engine: 'google' | 'gemini') => {
    if (!newDescription.trim()) return;
    setTranslatingEngine(engine);
    try {
      const translated = await translateTextWithAI(newDescription.trim(), 'en', 'dish', engine);
      setNewDescriptionEn(translated);
    } finally {
      setTranslatingEngine(null);
    }
  };

  const handleTranslateEdit = async (engine: 'google' | 'gemini') => {
    if (!editDescription.trim()) return;
    setTranslatingEditEngine(engine);
    try {
      const translated = await translateTextWithAI(editDescription.trim(), 'en', 'dish', engine);
      setEditDescriptionEn(translated);
    } finally {
      setTranslatingEditEngine(null);
    }
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newItem: MenuItem = {
      id: `master-${Date.now()}`,
      category: newCategory,
      name: newName.trim(),
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

  const handleStartEdit = (item: MenuItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditDescription(item.description);
    setEditDescriptionEn(item.descriptionEn || '');
    setEditTags([...item.dietary]);
    setEditHighlight(item.highlight || '');
    setEditHighlightEn(item.highlightEn || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editName.trim()) return;

    const updated = masterDatabase.map((item) => {
      if (item.id === editingItem.id) {
        return {
          ...item,
          name: editName.trim(),
          category: editCategory,
          description: editDescription.trim(),
          descriptionEn: editDescriptionEn.trim() || undefined,
          dietary: [...editTags],
          highlight: editHighlight.trim() || undefined,
          highlightEn: editHighlightEn.trim() || undefined,
        };
      }
      return item;
    });

    onUpdateMasterDatabase(updated);
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm('Remover esta criação do Acervo Mestre Permanente?')) {
      const updated = masterDatabase.filter((item) => item.id !== id);
      onUpdateMasterDatabase(updated);
    }
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
            type="button"
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
          type="button"
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
          type="button"
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
          type="button"
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

      {/* ITEMS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const hasEnglishDesc = Boolean(item.descriptionEn && item.descriptionEn.trim());

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

                {/* DISH NAME */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-white font-display">
                    {item.name}
                  </h3>
                </div>

                {/* DESTAQUE DISPLAY (HIGHLIGHT EDIT MOVED TO COMPLETE EDIT MODAL) */}
                {item.highlight ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-[#d3a809] bg-[#d3a809]/10 border border-[#d3a809]/20 px-2 py-0.5 rounded">
                      {item.highlight}
                      {item.highlightEn && (
                        <span className="text-neutral-400 font-normal ml-1">· EN: {item.highlightEn}</span>
                      )}
                    </span>
                  </div>
                ) : null}

                {/* ALERT FOR DISHES WITHOUT ENGLISH DESCRIPTION */}
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

              {/* ACTION BUTTONS: EDITAR (TOTAL) & EXCLUIR */}
              <div className="pt-2.5 border-t border-white/[0.08] flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleStartEdit(item)}
                  className="px-2.5 py-1 bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                  title="Editar receita completa no acervo"
                >
                  <Edit2 className="w-3 h-3 text-[#d3a809]" />
                  <span>Editar</span>
                </button>

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

      {/* FULL EDIT MODAL FOR MASTER DATABASE ITEM */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="glass-panel border border-[#d3a809]/40 w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-[#d3a809]" />
                  Editar Criação no Acervo Mestre
                </h3>
                <span className="text-[10px] font-mono text-neutral-400">ID: {editingItem.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
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
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as DishCategory)}
                  className="w-full mt-1 px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809]"
                >
                  <option value="main">Prato Principal</option>
                  <option value="dessert">Sobremesa</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
                  Nome do Prato (Único) *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
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
                    value={editHighlight}
                    onChange={(e) => setEditHighlight(e.target.value)}
                    placeholder="Ex: Sugestão do Chef"
                    className="w-full mt-1 px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
                    Destaque (EN-US) — Slot Manual
                  </label>
                  <input
                    type="text"
                    value={editHighlightEn}
                    onChange={(e) => setEditHighlightEn(e.target.value)}
                    placeholder="Ex: Chef's Suggestion"
                    className="w-full mt-1 px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809] italic"
                  />
                </div>
              </div>

              {/* DESCRIPTION & TRANSLATION OPTIONS */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
                    Descrição Gastronômica (PT-BR) *
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTranslateEdit('google')}
                      disabled={translatingEditEngine !== null || !editDescription.trim()}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-200 rounded disabled:opacity-50 cursor-pointer"
                    >
                      {translatingEditEngine === 'google' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                      <span>Google</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTranslateEdit('gemini')}
                      disabled={translatingEditEngine !== null || !editDescription.trim()}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-[#d3a809]/20 hover:bg-[#d3a809]/30 border border-[#d3a809]/40 text-[#d3a809] rounded disabled:opacity-50 cursor-pointer"
                    >
                      {translatingEditEngine === 'gemini' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      <span>Gemini IA</span>
                    </button>
                  </div>
                </div>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full mt-1 px-3.5 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809] resize-none"
                  required
                />
              </div>

              {/* ENGLISH TRANSLATION SLOT */}
              <div>
                <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
                  Slot de Descrição em Inglês (EN-US) — Editável Manualmente:
                </label>
                <textarea
                  value={editDescriptionEn}
                  onChange={(e) => setEditDescriptionEn(e.target.value)}
                  rows={2}
                  className="w-full mt-1 px-3.5 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809] resize-none italic"
                />
              </div>

              {/* STRUCTURED DIETARY TAGS */}
              <div className="space-y-1">
                <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
                  Tags de Restrição Alimentar (Definidas):
                </label>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {ALLOWED_DIETARY_TAGS.map((tag) => {
                    const isSelected = editTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleEditTag(tag)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#d3a809] text-neutral-950 font-bold border-[#d3a809]'
                            : 'bg-black/40 text-neutral-400 border-white/[0.1] hover:border-white/[0.3]'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs text-neutral-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#d3a809] hover:bg-[#b89100] text-neutral-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD MODAL WITH STRUCTURED DIETARY TAGS & TRANSLATIONS */}
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
                    placeholder="Ex: Sugestão do Chef"
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
                    placeholder="Ex: Chef's Suggestion"
                    className="w-full mt-1 px-3 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809] italic"
                  />
                </div>
              </div>

              {/* DESCRIPTION & TRANSLATION OPTIONS */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
                    Descrição Gastronômica (PT-BR) *
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTranslateNew('google')}
                      disabled={translatingEngine !== null || !newDescription.trim()}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-200 rounded disabled:opacity-50 cursor-pointer"
                    >
                      {translatingEngine === 'google' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                      <span>Google</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTranslateNew('gemini')}
                      disabled={translatingEngine !== null || !newDescription.trim()}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-[#d3a809]/20 hover:bg-[#d3a809]/30 border border-[#d3a809]/40 text-[#d3a809] rounded disabled:opacity-50 cursor-pointer"
                    >
                      {translatingEngine === 'gemini' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      <span>Gemini IA</span>
                    </button>
                  </div>
                </div>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  className="w-full mt-1 px-3.5 py-2 bg-black/50 border border-white/[0.12] rounded-xl text-white outline-none focus:border-[#d3a809] resize-none"
                  required
                />
              </div>

              {/* ENGLISH TRANSLATION SLOT */}
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

              {/* STRUCTURED DIETARY TAGS */}
              <div className="space-y-1">
                <label className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
                  Tags de Restrição Alimentar (Definidas):
                </label>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {ALLOWED_DIETARY_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#d3a809] text-neutral-950 font-bold border-[#d3a809]'
                            : 'bg-black/40 text-neutral-400 border-white/[0.1] hover:border-white/[0.3]'
                        }`}
                      >
                        {tag}
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
                Cadastrar no Acervo
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
