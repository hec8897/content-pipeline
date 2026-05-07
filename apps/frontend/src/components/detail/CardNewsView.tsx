import type { CardNewsCard } from "@/lib/types";

export function CardNewsView({ card, idx }: { card: CardNewsCard; idx: number }) {
  return (
    <div
      className="aspect-square rounded-md p-3.5 flex flex-col justify-between"
      style={{ background: card.bg, color: card.fg }}
    >
      <div className="flex items-start justify-between text-[10px] opacity-70 font-mono">
        {card.type === "cover" ? (
          <span>{card.tag}</span>
        ) : (
          <span>{card.num ?? String(idx + 1).padStart(2, "0")}</span>
        )}
      </div>
      <div
        className={`flex flex-col gap-1 ${
          card.type === "cover" || card.type === "outro" ? "text-center" : ""
        }`}
      >
        <h4 className="text-[14px] font-bold whitespace-pre-line leading-snug">
          {card.title}
        </h4>
        {card.subtitle && (
          <p className="text-[11px] opacity-80 whitespace-pre-line">
            {card.subtitle}
          </p>
        )}
        {card.body && (
          <p className="text-[10px] opacity-75 whitespace-pre-line leading-relaxed">
            {card.body}
          </p>
        )}
        {card.cta && (
          <p className="text-[10px] opacity-70 mt-1 font-mono">{card.cta}</p>
        )}
      </div>
    </div>
  );
}
