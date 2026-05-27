'use client';

import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, RotateCw, Sparkles, Upload } from 'lucide-react';

import { ApiError } from '@/lib/api/client';
import { draftsApi } from '@/lib/api/drafts';
import type { CardNewsCard } from '@/types';

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB — 백엔드/버킷 제한과 일치

// 우측 패널의 배경 이미지 박스 — AI 재생성 + 로컬 업로드 + 제거.
// 재생성/업로드 모두 backend 가 Storage 에 push 하고 public URL 을 반환 → onSetImage 로 카드에 반영.
// 그 URL 은 autosave(PATCH) 때 card_news[idx].bg_image 로 영속화된다.
export function CardImageBox({
  draftId,
  card,
  cardIndex,
  onSetImage,
}: {
  draftId: string;
  card: CardNewsCard;
  cardIndex: number;
  // url=undefined 면 이미지 제거.
  onSetImage: (cardId: string, url: string | undefined) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  const regen = useMutation({
    mutationFn: ({ index }: { cardId: string; index: number }) =>
      draftsApi.regenerateCardImage(draftId, index),
    onSuccess: (res, vars) => onSetImage(vars.cardId, res.imageUrl),
  });

  const upload = useMutation({
    mutationFn: ({ file, index }: { cardId: string; file: File; index: number }) =>
      draftsApi.uploadCardImage(draftId, index, file),
    onSuccess: (res, vars) => onSetImage(vars.cardId, res.imageUrl),
  });

  const busy = regen.isPending || upload.isPending;

  const apiError = (e: unknown, fallback: string) =>
    e instanceof ApiError ? e.message : e ? fallback : null;
  const error =
    clientError ??
    apiError(regen.error, '이미지 생성에 실패했어요') ??
    apiError(upload.error, '이미지 업로드에 실패했어요');

  const regenerate = () => {
    if (cardIndex < 0 || busy) return;
    setClientError(null);
    regen.mutate({ cardId: card.id, index: cardIndex });
  };

  const triggerUpload = () => fileInputRef.current?.click();
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || cardIndex < 0 || busy) return;
    if (!ALLOWED_MIME.includes(file.type)) {
      setClientError('PNG · JPG · WebP 이미지만 업로드할 수 있어요');
      return;
    }
    if (file.size > MAX_BYTES) {
      setClientError('이미지는 5MB 이하만 업로드할 수 있어요');
      return;
    }
    setClientError(null);
    upload.mutate({ cardId: card.id, file, index: cardIndex });
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
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFile}
      />
      <div className="flex items-center gap-1.5">
        <button
          onClick={triggerUpload}
          disabled={busy}
          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] border border-border text-text-2 hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {upload.isPending ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" /> 업로드 중…
            </>
          ) : (
            <>
              <Upload className="w-3 h-3" /> 업로드
            </>
          )}
        </button>
        <button
          onClick={regenerate}
          disabled={busy}
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
      {error && (
        <div className="flex flex-col gap-1 rounded bg-red-500/10 border border-red-500/30 px-2 py-1.5">
          <span className="text-[10.5px] text-red-500">{error}</span>
        </div>
      )}
      <span className="text-[10.5px] text-text-3">
        💡 PNG · JPG · WebP, 5MB 이하 · 저장 시 함께 보관돼요
      </span>
    </div>
  );
}
