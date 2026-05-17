'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

import type { CardNewsCard } from '@/types';

export function AddCardMenu({
  cards,
  maxCards,
  onAdd,
}: {
  cards: CardNewsCard[];
  /** 이 수 이상이면 dropdown disabled — backend cardNewsSchema tuple 과 정합. */
  maxCards: number;
  onAdd: (type: CardNewsCard['type']) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const atMax = cards.length >= maxCards;
  const hasCover = cards.some((c) => c.type === 'cover');
  const hasOutro = cards.some((c) => c.type === 'outro');
  const items: { type: CardNewsCard['type']; label: string; note: string | null }[] = [
    { type: 'cover', label: '표지', note: hasCover ? '이미 있음' : null },
    { type: 'body', label: '본문', note: null },
    { type: 'outro', label: '마무리', note: hasOutro ? '이미 있음' : null },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          if (atMax) return;
          setOpen((o) => !o);
        }}
        disabled={atMax}
        aria-haspopup="menu"
        aria-expanded={open}
        title={atMax ? `이미 ${maxCards}장 (최대)` : undefined}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11.5px] text-text-2 border border-border hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        <Plus className="w-3.5 h-3.5" /> 카드 추가
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-20 bg-surface border border-border rounded-md shadow-md min-w-[160px] py-1"
        >
          {items.map((it) => (
            <button
              key={it.type}
              role="menuitem"
              onClick={() => {
                onAdd(it.type);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-2.5 py-1.5 text-[11.5px] text-text-2 hover:bg-surface-2"
            >
              <span>+ {it.label}</span>
              {it.note && <span className="text-[10px] text-text-3">{it.note}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
