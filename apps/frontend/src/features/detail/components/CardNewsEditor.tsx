'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Sparkles, Trash2, Upload } from 'lucide-react';
import type { CardNewsCard } from '@/types';

const PRESETS: { bg: string; fg: string }[] = [
  { bg: '#1a1a2e', fg: 'white' },
  { bg: '#0a3d2c', fg: 'white' },
  { bg: '#5b5bd6', fg: 'white' },
  { bg: '#c87f0a', fg: 'white' },
  { bg: '#222', fg: 'white' },
  { bg: '#f6f5f1', fg: '#222' },
  { bg: '#fef3c7', fg: '#3a2e0c' },
  { bg: '#e0f2fe', fg: '#0c4a6e' },
];

type Props = {
  initial: CardNewsCard[];
  onChange?: (cards: CardNewsCard[]) => void;
  onSave?: (cards: CardNewsCard[]) => void;
};

function SortableCard({
  card,
  index,
  selected,
  onSelect,
  onDelete,
  canDelete,
}: {
  card: CardNewsCard;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    background: card.bg,
    color: card.fg,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`relative aspect-square rounded-md p-3.5 cursor-pointer flex flex-col justify-between ${
        selected
          ? 'outline outline-2 outline-accent shadow-[0_0_0_4px_var(--color-accent-soft)]'
          : 'outline outline-1 outline-border'
      }`}
    >
      {/* index pill */}
      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/30 text-white rounded text-[10px] font-mono backdrop-blur">
        {String(index + 1).padStart(2, '0')}
      </div>
      {/* drag handle */}
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-1.5 right-1.5 p-1 bg-black/30 text-white rounded backdrop-blur cursor-grab active:cursor-grabbing"
        aria-label="drag"
      >
        <GripVertical className="w-3 h-3" />
      </button>

      {/* delete */}
      {selected && canDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute bottom-1.5 right-1.5 w-[22px] h-[22px] rounded-full bg-danger text-white flex items-center justify-center hover:scale-110 transition"
          aria-label="delete"
        >
          ✕
        </button>
      )}

      <div />
      <div
        className={`flex flex-col gap-1 ${
          card.type === 'cover' || card.type === 'outro' ? 'text-center' : ''
        }`}
      >
        <h4 className="text-[12px] font-bold whitespace-pre-line leading-tight">{card.title}</h4>
        {card.subtitle && (
          <p className="text-[10px] opacity-80 whitespace-pre-line">{card.subtitle}</p>
        )}
        {card.body && (
          <p
            className="text-[9.5px] opacity-75 whitespace-pre-line leading-snug"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {card.body}
          </p>
        )}
      </div>
    </div>
  );
}

export function CardNewsEditor({ initial, onChange, onSave }: Props) {
  const [cards, setCards] = useState<CardNewsCard[]>(initial);
  const [selectedId, setSelectedId] = useState<string>(initial[0]?.id ?? '');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const selected = useMemo(
    () => cards.find((c) => c.id === selectedId) ?? cards[0],
    [cards, selectedId],
  );
  const selectedIdx = cards.findIndex((c) => c.id === selected?.id);

  const applyCards = (next: CardNewsCard[]) => {
    setCards(next);
    onChange?.(next);
  };

  const updateSelected = (patch: Partial<CardNewsCard>) => {
    applyCards(cards.map((c) => (c.id === selected.id ? { ...c, ...patch } : c)));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = cards.findIndex((c) => c.id === active.id);
    const newIndex = cards.findIndex((c) => c.id === over.id);
    applyCards(arrayMove(cards, oldIndex, newIndex));
  };

  const addCard = () => {
    const id = `c${Date.now()}`;
    const next: CardNewsCard = {
      id,
      type: 'body',
      num: String(cards.length + 1).padStart(2, '0'),
      title: '새 카드',
      body: '내용을 입력하세요.',
      bg: '#222',
      fg: 'white',
    };
    applyCards([...cards, next]);
    setSelectedId(id);
  };

  const deleteSelected = () => {
    if (cards.length <= 2) return;
    applyCards(cards.filter((c) => c.id !== selected.id));
    setSelectedId(cards[0]?.id ?? '');
  };

  return (
    <div className="px-7 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
      {/* Left: grid */}
      <div className="flex flex-col gap-3 min-w-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[11.5px] text-text-3">
            {cards.length}장 · 1080×1080 · 드래그로 순서 바꾸기
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={addCard}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11.5px] text-text-2 border border-border hover:bg-surface-2"
            >
              <Plus className="w-3.5 h-3.5" /> 카드 추가
            </button>
            <button
              onClick={() => onSave?.(cards)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11.5px] font-semibold bg-text text-white hover:bg-black"
            >
              저장하고 닫기
            </button>
          </div>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={cards.map((c) => c.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {cards.map((c, i) => (
                <SortableCard
                  key={c.id}
                  card={c}
                  index={i}
                  selected={c.id === selected?.id}
                  onSelect={() => setSelectedId(c.id)}
                  onDelete={deleteSelected}
                  canDelete={cards.length > 2}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Right: edit panel */}
      <aside className="bg-surface border border-border rounded-[10px] p-3.5 flex flex-col gap-3.5 lg:sticky lg:top-4 lg:h-fit">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-surface-2 text-[10px] font-mono text-text-2">
              {String(selectedIdx + 1).padStart(2, '0')} / {String(cards.length).padStart(2, '0')}
            </span>
            <span className="text-[12.5px] font-semibold text-text">카드 편집</span>
          </div>
          {cards.length > 2 && (
            <button
              onClick={deleteSelected}
              className="text-text-3 hover:text-danger"
              aria-label="delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </header>

        {/* 제목 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-wide text-text-3">제목</label>
          <textarea
            rows={2}
            value={selected?.title ?? ''}
            onChange={(e) => updateSelected({ title: e.target.value })}
            className="bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-[12.5px] outline-none focus:border-accent resize-none"
          />
        </div>

        {/* 본문 / 서브타이틀 */}
        {selected?.type === 'cover' ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase tracking-wide text-text-3">서브타이틀</label>
            <input
              value={selected?.subtitle ?? ''}
              onChange={(e) => updateSelected({ subtitle: e.target.value })}
              className="bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-[12.5px] outline-none focus:border-accent"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase tracking-wide text-text-3">본문</label>
            <textarea
              rows={5}
              value={selected?.body ?? ''}
              onChange={(e) => updateSelected({ body: e.target.value })}
              className="bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-[12.5px] outline-none focus:border-accent resize-none"
            />
          </div>
        )}

        {/* 배경색 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-wide text-text-3">배경색</label>
          <div className="grid grid-cols-8 gap-1.5">
            {PRESETS.map((p) => {
              const active = selected?.bg === p.bg;
              return (
                <button
                  key={p.bg}
                  onClick={() => updateSelected({ bg: p.bg, fg: p.fg })}
                  className={`aspect-square rounded ${
                    active ? 'outline outline-2 outline-text' : 'outline outline-1 outline-border'
                  }`}
                  style={{ background: p.bg }}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={selected?.bg ?? '#000000'}
              onChange={(e) => updateSelected({ bg: e.target.value })}
              className="w-7 h-7 rounded border border-border"
            />
            <span className="text-[11px] font-mono text-text-3">{selected?.bg}</span>
          </div>
        </div>

        {/* 이미지 */}
        <div className="flex flex-col gap-2 border border-dashed border-border rounded-md p-2.5">
          <span className="text-[11px] text-text-2">
            현재 단색 배경 — 이미지로 교체할 수 있어요
          </span>
          <div className="flex items-center gap-1.5">
            <button className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] border border-border text-text-2 hover:bg-surface-2">
              <Upload className="w-3 h-3" /> 업로드
            </button>
            <button className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] border border-border text-text-2 hover:bg-surface-2">
              <Sparkles className="w-3 h-3" /> AI 재생성
            </button>
          </div>
          <span className="text-[10.5px] font-mono text-text-3">gemini-2.5-flash · 7s 예상</span>
        </div>

        <div className="bg-surface-2 rounded p-2 text-[10.5px] text-text-3">
          💡 저장 시 자동으로 인스타에 재발행 큐에 추가됩니다.
        </div>
      </aside>
    </div>
  );
}
