'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

import type { CardNewsCard } from '@/types';

export function SortableCard({
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

  const hasImage = !!card.bg_image;
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    ...(hasImage
      ? {
          backgroundColor: card.bg,
          backgroundImage: `url(${card.bg_image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: 'white',
        }
      : { background: card.bg, color: card.fg }),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`relative aspect-square rounded-md p-3.5 cursor-pointer flex flex-col justify-between overflow-hidden ${
        selected
          ? 'outline outline-2 outline-accent shadow-[0_0_0_4px_var(--color-accent-soft)]'
          : 'outline outline-1 outline-border'
      }`}
    >
      {hasImage && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.35)' }}
        />
      )}
      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/30 text-white rounded text-[10px] font-mono backdrop-blur z-10">
        {String(index + 1).padStart(2, '0')}
      </div>
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-1.5 right-1.5 p-1 bg-black/30 text-white rounded backdrop-blur cursor-grab active:cursor-grabbing z-10"
        aria-label="drag"
      >
        <GripVertical className="w-3 h-3" />
      </button>

      {selected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (canDelete) onDelete();
          }}
          disabled={!canDelete}
          title={canDelete ? undefined : '최소 1장은 유지'}
          className="absolute bottom-1.5 right-1.5 w-[22px] h-[22px] rounded-full bg-danger text-white flex items-center justify-center hover:scale-110 transition z-10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          aria-label="delete"
        >
          ✕
        </button>
      )}

      <div className="relative z-10" />
      <div
        className={`relative z-10 flex flex-col gap-1 ${
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
