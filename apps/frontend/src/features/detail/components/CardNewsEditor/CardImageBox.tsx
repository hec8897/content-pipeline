'use client';

import { useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, RotateCw, Sparkles, Upload } from 'lucide-react';

import { ApiError } from '@/lib/api/client';
import { draftsApi } from '@/lib/api/drafts';
import type { CardNewsCard } from '@/types';

// 우측 패널의 배경 이미지 박스 — AI 재생성 + 로컬 업로드 + 제거.
// mutation / FileReader 모두 여기 캡슐화. 부모는 cardId 기반 patch callback 만 노출.
// 영속화는 in-memory only — 새로고침 시 사라짐 (Storage 연동은 추후 phase).
export function CardImageBox({
  draftId,
  card,
  cardIndex,
  onSetImage,
}: {
  draftId: string;
  card: CardNewsCard;
  cardIndex: number;
  // dataUrl=undefined 면 이미지 제거.
  onSetImage: (cardId: string, dataUrl: string | undefined) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const regen = useMutation({
    mutationFn: ({ index }: { cardId: string; index: number }) =>
      draftsApi.regenerateCardImage(draftId, index),
    onSuccess: (res, vars) => {
      onSetImage(vars.cardId, `data:image/png;base64,${res.imageBase64}`);
    },
  });

  const regenError =
    regen.error instanceof ApiError
      ? regen.error.message
      : regen.error
        ? '이미지 생성에 실패했어요'
        : null;

  const regenerate = () => {
    if (cardIndex < 0) return;
    regen.mutate({ cardId: card.id, index: cardIndex });
  };

  const triggerUpload = () => fileInputRef.current?.click();
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') onSetImage(card.id, result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-2 border border-dashed border-border rounded-md p-2.5">
      <span className="text-[11px] text-text-2">
        {card.bg_image
          ? '배경 이미지가 적용됐어요'
          : '단색 배경 — 이미지로 교체할 수 있어요'}
      </span>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <div className="flex items-center gap-1.5">
        <button
          onClick={triggerUpload}
          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] border border-border text-text-2 hover:bg-surface-2"
        >
          <Upload className="w-3 h-3" /> 업로드
        </button>
        <button
          onClick={regenerate}
          disabled={regen.isPending}
          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] border border-border text-text-2 hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {regen.isPending ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" /> 생성 중…
            </>
          ) : card.bg_image ? (
            <>
              <RotateCw className="w-3 h-3" /> AI 다시
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3" /> AI 재생성
            </>
          )}
        </button>
      </div>
      {card.bg_image && (
        <button
          onClick={() => onSetImage(card.id, undefined)}
          className="self-start text-[10.5px] text-text-3 hover:text-text underline"
        >
          이미지 제거 → 단색으로
        </button>
      )}
      {regenError && (
        <div className="flex flex-col gap-1 rounded bg-red-500/10 border border-red-500/30 px-2 py-1.5">
          <span className="text-[10.5px] text-red-500">{regenError}</span>
          <button
            onClick={regenerate}
            className="self-start text-[10.5px] underline text-red-500 hover:text-red-600"
          >
            다시 시도
          </button>
        </div>
      )}
      <span className="text-[10.5px] text-text-3">
        💡 배경 이미지는 새로고침 시 사라져요 (영속화는 추후 phase)
      </span>
    </div>
  );
}
