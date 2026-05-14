'use client';

import { AlertTriangle, RotateCw } from 'lucide-react';

export type AutosaveStatus = 'saved' | 'saving' | 'failed';

type Props = {
  status: AutosaveStatus;
  savedAgo: string;
  onRetry?: () => void;
};

export function AutosaveIndicator({ status, savedAgo, onRetry }: Props) {
  if (status === 'failed') {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-semibold text-danger border border-danger/40 hover:bg-danger/10 transition-colors"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        저장 실패 — 재시도
        <RotateCw className="w-3 h-3" />
      </button>
    );
  }

  const isSaving = status === 'saving';
  const dotColor = isSaving ? 'var(--color-accent)' : 'var(--color-success)';
  const label = isSaving ? '저장 중…' : `${savedAgo} 저장됨`;

  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-mono text-text-2">
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{
          background: dotColor,
          animation: isSaving ? 'pulse-dot 1s ease infinite' : undefined,
        }}
      />
      {label}
    </span>
  );
}
