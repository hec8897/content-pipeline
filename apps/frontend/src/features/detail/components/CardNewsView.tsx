import type { CardNewsCard } from '@/types';

export function CardNewsView({ card, idx }: { card: CardNewsCard; idx: number }) {
  const hasImage = !!card.bg_image;
  const rootStyle: React.CSSProperties = hasImage
    ? {
        backgroundColor: card.bg,
        backgroundImage: `url(${card.bg_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: 'white',
      }
    : { background: card.bg, color: card.fg };

  return (
    <div
      className="relative aspect-square rounded-md p-3.5 flex flex-col justify-between overflow-hidden"
      style={rootStyle}
    >
      {hasImage && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.35)' }}
        />
      )}
      <div className="relative z-10 flex items-start justify-between text-[10px] opacity-70 font-mono">
        {card.type === 'cover' ? (
          <span>{card.tag}</span>
        ) : (
          <span>{card.num ?? String(idx + 1).padStart(2, '0')}</span>
        )}
      </div>
      <div
        className={`relative z-10 flex flex-col gap-1 ${
          card.type === 'cover' || card.type === 'outro' ? 'text-center' : ''
        }`}
      >
        <h4 className="text-[14px] font-bold whitespace-pre-line leading-snug">{card.title}</h4>
        {card.subtitle && (
          <p className="text-[11px] opacity-80 whitespace-pre-line">{card.subtitle}</p>
        )}
        {card.body && (
          <p className="text-[10px] opacity-75 whitespace-pre-line leading-relaxed">{card.body}</p>
        )}
        {card.cta && <p className="text-[10px] opacity-70 mt-1 font-mono">{card.cta}</p>}
      </div>
    </div>
  );
}
