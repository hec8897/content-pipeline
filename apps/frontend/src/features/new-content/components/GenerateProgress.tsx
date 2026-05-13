'use client';

import { Loader2, RotateCw } from 'lucide-react';

export type GenerateStep = { id: number; label: string };

export const GENERATE_STEPS: readonly GenerateStep[] = [
  { id: 1, label: '인터뷰 분석' },
  { id: 2, label: '카드뉴스 작성' },
  { id: 3, label: '블로그 작성' },
  { id: 4, label: '마무리 정리' },
] as const;

type Props = {
  active: number;
  logs: string[];
  error: string | null;
  onRetry: () => void;
};

export function GenerateProgress({ active, logs, error, onRetry }: Props) {
  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-[640px] flex flex-col items-center gap-8">
        {error ? (
          <div className="w-full bg-red-500/5 border border-red-500/30 rounded-[10px] p-5 flex flex-col gap-3 items-start">
            <div className="text-[14px] font-semibold text-red-500">양산에 실패했어요</div>
            <p className="text-[12.5px] text-text-2 whitespace-pre-line">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12.5px] font-semibold bg-text text-white hover:bg-black"
            >
              <RotateCw className="w-3.5 h-3.5" /> 다시 시도
            </button>
          </div>
        ) : (
          <>
            <Loader2 className="w-10 h-10 text-accent animate-spin" />
            <div className="text-center">
              <h2 className="text-[18px] font-semibold text-text">콘텐츠를 양산하고 있어요</h2>
              <p className="text-[12.5px] text-text-2 mt-1">보통 30~60초 정도 걸려요</p>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
          {GENERATE_STEPS.map((s, i) => {
            const isActive = active === i + 1;
            const done = active > i + 1;
            return (
              <div
                key={s.id}
                className={`p-2.5 rounded-md border text-[11.5px] flex flex-col gap-1 ${
                  isActive
                    ? 'border-accent bg-accent-soft text-accent'
                    : done
                      ? 'border-border bg-surface text-text'
                      : 'border-border bg-surface text-text-3'
                }`}
              >
                <span className="text-[10px] font-mono">{String(i + 1).padStart(2, '0')}</span>
                <span className="font-medium">{s.label}</span>
              </div>
            );
          })}
        </div>

        <div className="w-full bg-text rounded-md p-3 max-h-48 overflow-auto font-mono text-[11px] text-white/80">
          {logs.map((l, i) => (
            <div key={i} className="leading-relaxed">
              {l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
