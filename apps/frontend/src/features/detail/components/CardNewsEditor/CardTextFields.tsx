'use client';

import type { CardNewsCard } from '@/types';

// 카드 type 별 텍스트 입력 필드 분기.
// cover = subtitle + tag, body = body, outro = body + cta.
// 제목 (title) 은 type 무관이라 상위 패널이 담당.
export function CardTextFields({
  card,
  onChange,
}: {
  card: CardNewsCard;
  onChange: (patch: Partial<CardNewsCard>) => void;
}) {
  if (card.type === 'cover') {
    return (
      <>
        <Field label="서브타이틀">
          <input
            value={card.subtitle ?? ''}
            onChange={(e) => onChange({ subtitle: e.target.value })}
            className="bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-[12.5px] outline-none focus:border-accent"
          />
        </Field>
        <Field label="태그">
          <input
            value={card.tag ?? ''}
            onChange={(e) => onChange({ tag: e.target.value })}
            placeholder="@핸들 · 12.4"
            className="bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-[12.5px] outline-none focus:border-accent"
          />
        </Field>
      </>
    );
  }

  if (card.type === 'outro') {
    return (
      <>
        <Field label="본문">
          <textarea
            rows={4}
            value={card.body ?? ''}
            onChange={(e) => onChange({ body: e.target.value })}
            className="bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-[12.5px] outline-none focus:border-accent resize-none"
          />
        </Field>
        <Field label="CTA">
          <input
            value={card.cta ?? ''}
            onChange={(e) => onChange({ cta: e.target.value })}
            placeholder="→ Link in bio"
            className="bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-[12.5px] outline-none focus:border-accent"
          />
        </Field>
      </>
    );
  }

  return (
    <Field label="본문">
      <textarea
        rows={5}
        value={card.body ?? ''}
        onChange={(e) => onChange({ body: e.target.value })}
        className="bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-[12.5px] outline-none focus:border-accent resize-none"
      />
    </Field>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] uppercase tracking-wide text-text-3">{label}</label>
      {children}
    </div>
  );
}
