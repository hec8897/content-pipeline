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
} from '@dnd-kit/sortable';
import { Trash2 } from 'lucide-react';

import type { CardNewsCard } from '@/types';

import { AddCardMenu } from './AddCardMenu';
import { BackgroundPalette } from './BackgroundPalette';
import { CardImageBox } from './CardImageBox';
import { CardTextFields } from './CardTextFields';
import { SortableCard } from './SortableCard';

// 양산 결과는 정확히 8장이지만 편집 단계에선 자유 삭제 허용 (backend edit schema array, max 8).
// 추가는 8장에서 차단 (양산 외 새 카드 추가는 안 함). 삭제는 1장까지 자유.
const MIN_CARDS = 1;
const MAX_CARDS = 8;

type Props = {
  /** AI 재생성 호출 대상 draft id. Phase 6 — 카드 배경 이미지 즉석 생성. */
  draftId: string;
  initial: CardNewsCard[];
  onChange?: (cards: CardNewsCard[]) => void;
  onSave?: (cards: CardNewsCard[]) => void;
};

export function CardNewsEditor({ draftId, initial, onChange, onSave }: Props) {
  const [cards, setCards] = useState<CardNewsCard[]>(initial);
  const [selectedId, setSelectedId] = useState<string>(initial[0]?.id ?? '');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
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

  const patchCardById = (id: string, patch: Partial<CardNewsCard>) => {
    applyCards(cards.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const updateSelected = (patch: Partial<CardNewsCard>) => {
    if (!selected) return;
    patchCardById(selected.id, patch);
  };

  // 함수형 setter 패턴 — mutation onSuccess 가 stale cards 잡지 않도록.
  const setBgImage = (cardId: string, dataUrl: string | undefined) => {
    setCards((prev) => {
      const next = prev.map((c) => (c.id === cardId ? { ...c, bg_image: dataUrl } : c));
      onChange?.(next);
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = cards.findIndex((c) => c.id === active.id);
    const newIndex = cards.findIndex((c) => c.id === over.id);
    applyCards(arrayMove(cards, oldIndex, newIndex));
  };

  const addCard = (type: CardNewsCard['type']) => {
    if (cards.length >= MAX_CARDS) return;
    const id = `c${Date.now()}`;
    const base = { id, bg: '#222', fg: 'white' };
    let next: CardNewsCard;
    if (type === 'cover') {
      next = { ...base, type: 'cover', title: '표지\n제목', subtitle: '부제', tag: '@핸들' };
    } else if (type === 'outro') {
      next = {
        ...base,
        type: 'outro',
        title: '마무리',
        body: '여기까지 읽어줘서 고마워요.',
        cta: '→ 더 보기',
      };
    } else {
      next = {
        ...base,
        type: 'body',
        num: String(cards.length + 1).padStart(2, '0'),
        title: '새 카드',
        body: '내용을 입력하세요.',
      };
    }
    applyCards([...cards, next]);
    setSelectedId(id);
  };

  const deleteSelected = () => {
    if (cards.length <= MIN_CARDS || !selected) return;
    applyCards(cards.filter((c) => c.id !== selected.id));
    setSelectedId(cards[0]?.id ?? '');
  };

  return (
    <div className="px-7 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
      {/* 좌측 그리드 */}
      <div className="flex flex-col gap-3 min-w-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[11.5px] text-text-3">
            {cards.length}장 · 1080×1080 · 드래그로 순서 바꾸기
          </span>
          <div className="flex items-center gap-2">
            <AddCardMenu cards={cards} maxCards={MAX_CARDS} onAdd={addCard} />
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
                  canDelete={cards.length > MIN_CARDS}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* 우측 편집 패널 */}
      <aside className="bg-surface border border-border rounded-[10px] p-3.5 flex flex-col gap-3.5 lg:sticky lg:top-4 lg:h-fit">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-surface-2 text-[10px] font-mono text-text-2">
              {String(selectedIdx + 1).padStart(2, '0')} / {String(cards.length).padStart(2, '0')}
            </span>
            <span className="text-[12.5px] font-semibold text-text">카드 편집</span>
          </div>
          <button
            onClick={deleteSelected}
            disabled={cards.length <= MIN_CARDS}
            title={cards.length <= MIN_CARDS ? '최소 1장은 유지' : undefined}
            className="text-text-3 hover:text-danger disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-text-3"
            aria-label="delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </header>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-wide text-text-3">제목</label>
          <textarea
            rows={2}
            value={selected?.title ?? ''}
            onChange={(e) => updateSelected({ title: e.target.value })}
            className="bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-[12.5px] outline-none focus:border-accent resize-none"
          />
        </div>

        {selected && <CardTextFields card={selected} onChange={updateSelected} />}

        {selected && (
          <BackgroundPalette bg={selected.bg} onChange={(next) => updateSelected(next)} />
        )}

        {selected && (
          <CardImageBox
            draftId={draftId}
            card={selected}
            cardIndex={selectedIdx}
            onSetImage={setBgImage}
          />
        )}

        <div className="bg-surface-2 rounded p-2 text-[10.5px] text-text-3">
          💡 저장 시 자동으로 인스타에 재발행 큐에 추가됩니다.
        </div>
      </aside>
    </div>
  );
}
