'use client';

import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterOption {
  label: string;
  value: string;
}

interface SearchFiltersProps {
  genres: FilterOption[];
  languages: FilterOption[];
  years: FilterOption[];
  ratings: FilterOption[];
  types: FilterOption[];
  activeFilters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
}

const SORT_OPTIONS: FilterOption[] = [
  { label: 'Relevance', value: '' },
  { label: 'Rating', value: 'rating' },
  { label: 'Newest', value: 'latest' },
  { label: 'Title A-Z', value: 'title' },
];

export function SearchFilters({
  genres,
  languages,
  years,
  ratings,
  types,
  activeFilters,
  onFilterChange,
  onClearFilters,
}: SearchFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const activeCount = Object.values(activeFilters).filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
            expanded
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-border bg-surface text-muted hover:border-white/20 hover:text-white'
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>

        {activeCount > 0 && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 text-sm text-muted hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </button>
        )}
      </div>

      {expanded && (
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface/50 p-4 sm:grid-cols-3 md:grid-cols-6">
          <FilterGroup
            label="Type"
            options={types}
            value={activeFilters.type || ''}
            onChange={(v) => onFilterChange('type', v)}
          />
          <FilterGroup
            label="Genre"
            options={genres}
            value={activeFilters.genre || ''}
            onChange={(v) => onFilterChange('genre', v)}
          />
          <FilterGroup
            label="Year"
            options={years}
            value={activeFilters.year || ''}
            onChange={(v) => onFilterChange('year', v)}
          />
          <FilterGroup
            label="Rating"
            options={ratings}
            value={activeFilters.rating || ''}
            onChange={(v) => onFilterChange('rating', v)}
          />
          <FilterGroup
            label="Language"
            options={languages}
            value={activeFilters.language || ''}
            onChange={(v) => onFilterChange('language', v)}
          />
          <FilterGroup
            label="Sort"
            options={SORT_OPTIONS}
            value={activeFilters.sort || ''}
            onChange={(v) => onFilterChange('sort', v)}
          />
        </div>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-surface-hover px-2.5 py-1.5 text-xs text-white outline-none transition-colors focus:border-accent"
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
