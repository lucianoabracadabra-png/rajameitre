import React from 'react';
import { Leaf, MilkOff, WheatOff, Sprout } from 'lucide-react';

interface DietaryIconsProps {
  tags: string[];
}

export const DietaryIcons: React.FC<DietaryIconsProps> = ({ tags }) => {
  if (!tags || tags.length === 0) return null;

  const hasGlutenFree = tags.some((t) => t.toLowerCase().includes('sem glúten') || t.toLowerCase().includes('gluten'));
  const hasLactoseFree = tags.some((t) => t.toLowerCase().includes('sem lactose') || t.toLowerCase().includes('lactose'));
  const hasVegan = tags.some((t) => t.toLowerCase().includes('vegano'));
  const hasVegetarian = tags.some((t) => t.toLowerCase().includes('vegetariano') && !t.toLowerCase().includes('vegano'));

  return (
    <div className="flex items-center gap-2">
      {hasGlutenFree && (
        <span
          className="inline-flex items-center gap-1 text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md"
          title="Sem Glúten"
        >
          <WheatOff className="w-3.5 h-3.5 text-amber-300" />
          <span>Sem Glúten</span>
        </span>
      )}

      {hasLactoseFree && (
        <span
          className="inline-flex items-center gap-1 text-[11px] text-sky-200/90 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md"
          title="Sem Lactose"
        >
          <MilkOff className="w-3.5 h-3.5 text-sky-300" />
          <span>Sem Lactose</span>
        </span>
      )}

      {hasVegan && (
        <span
          className="inline-flex items-center gap-1 text-[11px] text-emerald-200/90 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md"
          title="Vegano"
        >
          <Sprout className="w-3.5 h-3.5 text-emerald-300" />
          <span>Vegano</span>
        </span>
      )}

      {hasVegetarian && (
        <span
          className="inline-flex items-center gap-1 text-[11px] text-lime-200/90 bg-lime-500/10 border border-lime-500/20 px-2 py-0.5 rounded-md"
          title="Vegetariano"
        >
          <Leaf className="w-3.5 h-3.5 text-lime-300" />
          <span>Vegetariano</span>
        </span>
      )}
    </div>
  );
};
