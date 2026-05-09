'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { routes } from '@/lib/routes';

const steps = [
  { label: '주제', href: routes.newContent },
  { label: '인터뷰', href: routes.newInterview },
  { label: '양산', href: routes.newGenerate },
  { label: '편집', href: routes.newEdit },
  { label: '발행', href: routes.newPublish },
] as const;

export function StepNav() {
  const pathname = usePathname();
  const activeIdx = steps.findIndex((s) =>
    s.href === routes.newContent ? pathname === s.href : pathname.startsWith(s.href),
  );

  return (
    <header className="sticky top-0 z-20 bg-surface border-b border-border px-5 sm:px-7 py-3 flex items-center gap-4">
      <Link href={routes.home} className="flex items-center gap-2 shrink-0">
        <div
          className="w-5 h-5 rounded"
          style={{ background: 'linear-gradient(135deg, #5b5bd6, #8b5cf6)' }}
        />
        <span className="text-[13px] font-semibold text-text hidden sm:inline">새 콘텐츠</span>
      </Link>

      <div className="flex-1 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
        {steps.map((s, i) => {
          const active = i === activeIdx;
          const done = i < activeIdx;
          return (
            <div key={s.href} className="flex items-center gap-1 sm:gap-2 shrink-0">
              <span
                className={`text-[10px] font-mono ${
                  done ? 'text-success' : active ? 'text-accent' : 'text-text-3'
                }`}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span
                className={`text-[12px] ${
                  active ? 'text-accent font-semibold' : done ? 'text-text-2' : 'text-text-3'
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && <span className="w-4 h-px bg-border mx-0.5" />}
            </div>
          );
        })}
      </div>

      <Link href={routes.home} className="text-text-3 hover:text-text shrink-0" aria-label="close">
        <X className="w-4 h-4" />
      </Link>
    </header>
  );
}
