'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';

type Props = {
  tags: string[];
  onChange: (next: string[]) => void;
  max?: number;
  maxTagLength?: number;
};

function clean(raw: string): string {
  return raw.replace(/^#+/, '').replace(/\s+/g, '');
}

export function HashtagChips({ tags, onChange, max = 10, maxTagLength = 40 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');

  const atMax = tags.length >= max;

  const commit = (raw: string): boolean => {
    const next = clean(raw);
    if (!next) return false;
    if (next.length > maxTagLength) return false;
    if (tags.includes(next)) return false;
    if (atMax) return false;
    onChange([...tags, next]);
    return true;
  };

  const remove = (idx: number) => {
    onChange(tags.filter((_, i) => i !== idx));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      if (commit(draft)) setDraft('');
      return;
    }
    if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      e.preventDefault();
      remove(tags.length - 1);
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="border border-border rounded-md bg-surface min-h-[38px] pl-2 pr-1.5 py-1.5 flex flex-wrap items-center gap-1.5 cursor-text focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--color-accent-soft)] transition-shadow"
    >
      {tags.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="inline-flex items-center gap-1 bg-accent-soft text-accent rounded-full pl-2 pr-1 py-[3px] text-[12px] font-semibold"
        >
          <span className="opacity-60">#</span>
          <span>{tag}</span>
          <button
            type="button"
            aria-label={`${tag} 삭제`}
            onClick={(e) => {
              e.stopPropagation();
              remove(i);
            }}
            className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-accent/15 text-accent/70 hover:text-accent transition"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => {
          if (commit(draft)) setDraft('');
        }}
        disabled={atMax}
        placeholder={
          atMax
            ? `최대 ${max}개까지`
            : tags.length === 0
              ? '태그를 입력하고 Enter'
              : '+ 추가'
        }
        className="flex-1 min-w-[120px] bg-transparent outline-none text-[12.5px] text-text placeholder:text-text-3 disabled:cursor-not-allowed py-[3px]"
      />
    </div>
  );
}
