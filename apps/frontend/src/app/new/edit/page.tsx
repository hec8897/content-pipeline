'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CardNewsEditor } from '@/features/detail/components/CardNewsEditor';
import { CARD_NEWS } from '@/mocks';
import { routes } from '@/lib/routes';

const TABS = [
  { key: 'insta', label: '인스타 카드뉴스' },
  { key: 'blog', label: '네이버 블로그' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function NewEditPage() {
  const [tab, setTab] = useState<TabKey>('insta');

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b border-border bg-surface px-7 flex items-center gap-5">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative py-3 text-[12.5px] ${
                active ? 'text-text font-semibold' : 'text-text-2 hover:text-text'
              }`}
            >
              {t.label}
              {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-text" />}
            </button>
          );
        })}
        <Link
          href={routes.newPublish}
          className="ml-auto inline-flex items-center gap-1.5 bg-text text-white rounded-md px-3.5 py-2 text-[12.5px] font-semibold hover:bg-black"
        >
          다음 — 발행 <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {tab === 'insta' ? (
        <CardNewsEditor initial={CARD_NEWS} />
      ) : (
        <div className="px-7 py-6">
          <div className="max-w-[720px] mx-auto bg-surface border border-border rounded-[10px] p-6 text-[12.5px] text-text-2">
            블로그 편집기는 곧 추가됩니다. 양산된 본문은 발행 단계에서 그대로 사용됩니다.
          </div>
        </div>
      )}
    </div>
  );
}
