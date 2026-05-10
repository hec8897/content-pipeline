'use client';

import { useState, type ReactNode } from 'react';

export type DetailTabKey = 'overview' | 'insta' | 'blog' | 'activity';

const tabs: { key: DetailTabKey; label: string }[] = [
  { key: 'overview', label: '개요' },
  { key: 'insta', label: '인스타 카드뉴스' },
  { key: 'blog', label: '네이버 블로그' },
  { key: 'activity', label: '발행 이력' },
];

type Props = {
  defaultTab?: DetailTabKey;
  panels: Record<DetailTabKey, ReactNode>;
};

export function DetailTabs({ defaultTab = 'overview', panels }: Props) {
  const [active, setActive] = useState<DetailTabKey>(defaultTab);
  return (
    <>
      <div className="border-b border-border bg-surface px-7">
        <div className="flex items-center gap-5 overflow-x-auto no-scrollbar">
          {tabs.map((t) => {
            const isActive = active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={`relative py-3 text-[12.5px] whitespace-nowrap transition-colors ${
                  isActive ? 'text-text font-semibold' : 'text-text-2 hover:text-text'
                }`}
              >
                {t.label}
                {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-text" />}
              </button>
            );
          })}
        </div>
      </div>
      <div>{panels[active]}</div>
    </>
  );
}
