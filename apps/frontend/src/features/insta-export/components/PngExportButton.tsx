'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

import type { CardNewsCard } from '@/types';

import { cardsToZip } from '../lib/cardsToZip';

// 헤더 actions 자리용 PNG zip 다운로드 버튼. 카드 빈 배열이면 disabled.
// 캡처 실패 시 inline 에러 메시지 표시 (toast 인프라 없음 — 옆 span).
export function PngExportButton({
  cards,
  topicTitle,
}: {
  cards: CardNewsCard[];
  topicTitle: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = busy || cards.length === 0;

  const handleClick = async () => {
    if (disabled) return;
    setError(null);
    setBusy(true);
    try {
      await cardsToZip(cards, topicTitle);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PNG 다운로드 실패');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-[11px] text-red-500">{error}</span>}
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 border border-border rounded-md px-3 py-2 text-[12.5px] text-text-2 hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        PNG 다운로드
      </button>
    </div>
  );
}
