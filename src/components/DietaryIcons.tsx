import React from 'react';
import { Leaf, MilkOff, WheatOff, Sprout, Sparkles, Ban } from 'lucide-react';
import { LanguageMode } from '../types';

interface DietaryIconsProps {
  tags: string[];
  size?: 'sm' | 'md';
  language?: LanguageMode;
}

export const DietaryIcons: React.FC<DietaryIconsProps> = ({ tags, size = 'sm', language = 'pt' }) => {
  if (!tags || tags.length === 0) return null;

  const isSmall = size === 'sm';
  const badgeClasses = isSmall
    ? 'text-[10px] px-2 py-0.5 rounded-md gap-1'
    : 'text-xs px-2.5 py-1 rounded-lg gap-1.5';
  const iconSize = isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const isEn = language === 'en';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => {
        const lower = tag.toLowerCase();

        if (lower.includes('vegano') || lower.includes('vegan')) {
          const label = isEn ? 'Vegan' : 'Vegano';
          return (
            <span
              key={tag}
              className={`inline-flex items-center text-emerald-200/95 bg-emerald-500/15 border border-emerald-500/30 font-medium ${badgeClasses}`}
              title={label}
            >
              <Sprout className={`${iconSize} text-emerald-400 shrink-0`} />
              <span>{label}</span>
            </span>
          );
        }

        if (lower.includes('vegetariano') || lower.includes('vegetarian')) {
          const label = isEn ? 'Vegetarian' : 'Vegetariano';
          return (
            <span
              key={tag}
              className={`inline-flex items-center text-lime-200/95 bg-lime-500/15 border border-lime-500/30 font-medium ${badgeClasses}`}
              title={label}
            >
              <Leaf className={`${iconSize} text-lime-400 shrink-0`} />
              <span>{label}</span>
            </span>
          );
        }

        if (lower.includes('glúten') || lower.includes('gluten')) {
          const label = isEn ? 'Gluten-Free' : 'Sem glúten';
          return (
            <span
              key={tag}
              className={`inline-flex items-center text-amber-200/95 bg-amber-500/15 border border-amber-500/30 font-medium ${badgeClasses}`}
              title={label}
            >
              <WheatOff className={`${iconSize} text-amber-400 shrink-0`} />
              <span>{label}</span>
            </span>
          );
        }

        if (lower.includes('lactose')) {
          const label = isEn ? 'Lactose-Free' : 'Sem Lactose';
          return (
            <span
              key={tag}
              className={`inline-flex items-center text-sky-200/95 bg-sky-500/15 border border-sky-500/30 font-medium ${badgeClasses}`}
              title={label}
            >
              <MilkOff className={`${iconSize} text-sky-400 shrink-0`} />
              <span>{label}</span>
            </span>
          );
        }

        if (lower.includes('zero açúcar') || lower.includes('zero acucar') || lower.includes('sugar-free')) {
          const label = isEn ? 'Sugar-Free' : 'Zero açúcar';
          return (
            <span
              key={tag}
              className={`inline-flex items-center text-purple-200/95 bg-purple-500/15 border border-purple-500/30 font-medium ${badgeClasses}`}
              title={label}
            >
              <Ban className={`${iconSize} text-purple-400 shrink-0`} />
              <span>{label}</span>
            </span>
          );
        }

        if (lower.includes('adição de açúcar') || lower.includes('adicao de acucar') || lower.includes('no added sugar')) {
          const label = isEn ? 'No Added Sugar' : 'Sem adição de açúcar';
          return (
            <span
              key={tag}
              className={`inline-flex items-center text-teal-200/95 bg-teal-500/15 border border-teal-500/30 font-medium ${badgeClasses}`}
              title={label}
            >
              <Sparkles className={`${iconSize} text-teal-400 shrink-0`} />
              <span>{label}</span>
            </span>
          );
        }

        return (
          <span
            key={tag}
            className={`inline-flex items-center text-neutral-300 bg-white/[0.05] border border-white/[0.1] ${badgeClasses}`}
          >
            {tag}
          </span>
        );
      })}
    </div>
  );
};
