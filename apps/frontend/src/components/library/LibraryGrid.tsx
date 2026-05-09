'use client';

import { useMemo, useState } from 'react';
import type { Content } from '@/lib/types';
import { LibraryCard } from './LibraryCard';
import { LibraryRow } from './LibraryRow';
import { LibraryToolbar, type FilterKey } from './LibraryToolbar';

type Props = {
  items: Content[];
};

export function LibraryGrid({ items }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const counts = useMemo(
    () =>
      items.reduce<Record<string, number>>((acc, p) => {
        acc[p.state] = (acc[p.state] || 0) + 1;
        return acc;
      }, {}),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((p) => {
      if (filter !== 'all' && p.state !== filter) return false;
      if (!q) return true;
      return p.title.toLowerCase().includes(q) || p.topic.toLowerCase().includes(q);
    });
  }, [items, query, filter]);

  return (
    <div className="flex flex-col gap-4">
      <LibraryToolbar
        query={query}
        onQueryChange={setQuery}
        filter={filter}
        onFilterChange={setFilter}
        view={view}
        onViewChange={setView}
        counts={counts}
      />

      {filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-[10px] py-16 text-center text-[12.5px] text-text-3">
          조건에 맞는 콘텐츠가 없어요
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((c) => (
            <LibraryCard key={c.id} content={c} />
          ))}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-[10px] overflow-hidden">
          {filtered.map((c) => (
            <LibraryRow key={c.id} content={c} />
          ))}
        </div>
      )}
    </div>
  );
}
