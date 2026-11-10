import React, { useState } from 'react';
import { MenuItem, DishCategory } from '../types';
import {
  Database,
  ShieldAlert,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { DietaryIcons } from './DietaryIcons';

interface MasterDatabaseViewProps {
  masterDatabase: MenuItem[];
  onUpdateMasterDatabase: (updatedDB: MenuItem[]) => void;
  onOpenGuestComanda: () => void;
}

export const MasterDatabaseView: React.FC<MasterDatabaseViewProps> = ({
  masterDatabase,
  onUpdateMasterDatabase,
  onOpenGuestComanda,
}) => {
  const [activeCategory, setActiveCategory] = useState<DishCategory | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New item form state
  const [newName, setNewName] = useState('');
  const [newFrenchTitle, setNewFrenchTitle] = useState('');
  const [newCategory, setNewCategory] = useState<DishCategory>('main');
  const [newDescription, setNewDescription] = useState('');
  const [newDietary, setNewDietary] = useState('Sem Glúten, Sem Lactose');
  const [newHighlight, setNewHighlight] = useState('');

  const filteredItems = masterDatabase.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newItem: MenuItem = {
      id: `master-${Date.now()}`,
      category: newCategory,
      name: newName.trim(),
      frenchTitle: newFrenchTitle.trim() || undefined,
      description: newDescription.trim() || 'Criação autoral do Chef Executivo BH Raja Hotel.',
      dietary: newDietary.split(',').map((s) => s.trim()).filter(Boolean),
      highlight: newHighlight.trim() || undefined,
    };

    const updated = [...masterDatabase, newItem];
    onUpdateMasterDatabase(updated);

    // Reset form
    setNewName('');
    setNewFrenchTitle('');
    setNewDescription('');
    setShowAddModal(false);
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover esta criação do Acervo Mestre Permanente?')) {
      const updated = masterDatabase.filter((item) => item.id !== id);
      onUpdateMasterDatabase(updated);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest">
            <Database className="w-4 h-4" />
            <span>Base Permanente do Hotel</span>
          </div>
          <h1 className="text-3xl font-serif-luxury font-bold text-white tracking-wide mt-1">
            Acervo Gastronômico Mestre (DB)
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Banco de dados permanente do BH Raja Hotel com criações canônicas protegidas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenGuestComanda}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            Comanda do Convidado
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Nova Criação
          </button>
        </div>
      </div>

      {/* CLARITY NOTICE */}
      <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 text-xs flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-white">
            Referencial Gastronômico Permanente
          </span>
          <p className="text-neutral-400 leading-relaxed">
            Esta tela é o acervo oficial da cozinha. Os eventos ativos apenas consultam e copiam deste banco referencial,
            garantindo que qualquer alteração pontual no evento do dia não altere as receitas originais cadastradas aqui.
          </p>
        </div>
      </div>

      {/* CATEGORY TABS */}
      <div className="flex items-center gap-2 p-1 bg-neutral-900/80 rounded-xl border border-neutral-800 self-start w-fit text-xs">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
            activeCategory === 'all'
              ? 'bg-amber-400 text-neutral-950 font-bold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Todos ({masterDatabase.length})
        </button>
        <button
          onClick={() => setActiveCategory('main')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
            activeCategory === 'main'
              ? 'bg-amber-400 text-neutral-950 font-bold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Pratos Principais
        </button>
        <button
          onClick={() => setActiveCategory('dessert')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
            activeCategory === 'dessert'
              ? 'bg-amber-400 text-neutral-950 font-bold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Sobremesas
        </button>
      </div>

      {/* ITEMS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="group bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between hover:border-neutral-700 transition-all shadow-lg"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  {item.category === 'main' ? 'Prato Principal' : 'Sobremesa'}
                </span>
                {item.highlight && (
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {item.highlight}
                  </span>
                )}
              </div>

              {item.frenchTitle && (
                <p className="text-xs text-amber-400/80 italic font-serif-luxury">
                  {item.frenchTitle}
                </p>
              )}

              <h3 className="text-base font-serif-luxury font-bold text-white group-hover:text-amber-200 transition-colors">
                {item.name}
              </h3>

              <p className="text-xs text-neutral-300 leading-relaxed font-light">
                {item.description}
              </p>

              <div className="pt-2">
                <DietaryIcons tags={item.dietary} />
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-[10px] text-neutral-500 font-mono">
                {item.id}
              </span>
              <button
                type="button"
                onClick={() => handleDeleteItem(item.id)}
                className="text-neutral-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                title="Remover do Acervo Mestre"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddNewItem}
            className="bg-[#121319] border border-amber-500/30 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-lg font-serif-luxury font-bold text-white">
                Cadastrar Nova Criação no Acervo Mestre
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-white text-xs px-2 py-1"
              >
                ✕ Cancelar
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-neutral-300 uppercase">
                  Categoria *
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as DishCategory)}
                  className="w-full mt-1 px-3 py-2 bg-black border border-neutral-700 rounded-lg text-white outline-none focus:border-amber-400"
                >
                  <option value="main">Prato Principal</option>
                  <option value="dessert">Sobremesa</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-neutral-300 uppercase">
                  Nome da Criação *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Tornedor ao Poivre & Ouro"
                  className="w-full mt-1 px-3 py-2 bg-black border border-neutral-700 rounded-lg text-white outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-300 uppercase">
                  Título em Francês (Opcional)
                </label>
                <input
                  type="text"
                  value={newFrenchTitle}
                  onChange={(e) => setNewFrenchTitle(e.target.value)}
                  placeholder="Ex: Tournedos au Poivre Vert"
                  className="w-full mt-1 px-3 py-2 bg-black border border-neutral-700 rounded-lg text-white outline-none focus:border-amber-400 italic"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-300 uppercase">
                  Descrição Gastronômica *
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  placeholder="Descrição elegante dos ingredientes e técnica..."
                  className="w-full mt-1 px-3 py-2 bg-black border border-neutral-700 rounded-lg text-white outline-none focus:border-amber-400 resize-none"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-300 uppercase">
                  Tags de Restrição Alimentar (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={newDietary}
                  onChange={(e) => setNewDietary(e.target.value)}
                  placeholder="Ex: Sem Glúten, Sem Lactose, Vegetariano, Vegano"
                  className="w-full mt-1 px-3 py-2 bg-black border border-neutral-700 rounded-lg text-white outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs text-neutral-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-400 text-neutral-950 font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-amber-300"
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
