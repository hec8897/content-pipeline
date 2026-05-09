'use client';

import { Search, LayoutGrid, List } from 'lucide-react';
import type { ContentState } from '@/lib/types';

export type FilterKey = 'all' | ContentState;

type Props = {
  query: string;
  onQueryChange: (q: string) => void;
  filter: FilterKey;
  onFilterChange: (f: FilterKey) => void;
  view: 'grid' | 'list';
  onViewChange: (v: 'grid' | 'list') => void;
  counts: Record<string, number>;
};

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'live', label: '발행됨' },
  { key: 'scheduled', label: '예약됨' },
  { key: 'processing', label: '진행중' },
  { key: 'draft', label: '초안' },
  { key: 'failed', label: '실패' },
];

export function LibraryToolbar({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  view,
  onViewChange,
  counts,
}: Props) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-md px-2.5 py-1.5 md:w-[280px]">
        <Search className="w-3.5 h-3.5 text-text-3" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="제목 또는 주제로 검색"
          className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-text-3"
        />
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {filters.map((f) => {
          const active = filter === f.key;
          const count = f.key === 'all' ? undefined : counts[f.key];
          return (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11.5px] transition-colors ${
                active
                  ? 'bg-text text-white font-semibold'
                  : 'bg-transparent border border-border text-text-2 hover:text-text'
              }`}
            >
              {f.label}
              {count != null && count > 0 && (
                <span
                  className={`text-[10.5px] font-mono ${active ? 'text-white/70' : 'text-text-3'}`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="hidden md:flex items-center gap-1 ml-auto bg-surface-2 border border-border rounded-md p-0.5">
        <button
          onClick={() => onViewChange('grid')}
          className={`p-1.5 rounded ${view === 'grid' ? 'bg-surface text-text' : 'text-text-3'}`}
          aria-label="grid"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onViewChange('list')}
          className={`p-1.5 rounded ${view === 'list' ? 'bg-surface text-text' : 'text-text-3'}`}
          aria-label="list"
        >
          <List className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
