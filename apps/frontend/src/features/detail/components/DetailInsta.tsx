'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, RotateCw, Sparkles } from 'lucide-react';
import { CardNewsView } from './CardNewsView';
import { Panel } from '@/components/ui/Panel';
import { PngExportButton } from '@/features/insta-export/components/PngExportButton';
import { ApiError } from '@/lib/api/client';
import { draftsApi } from '@/lib/api/drafts';
import { qk } from '@/lib/api/queryKeys';
import { toast } from '@/lib/toast';
import type { CardNewsCardData, DraftStatus } from '@/lib/api/types';
import { routes } from '@/lib/routes';

type Props = {
  contentId: string;
  draftId: string;
  status: DraftStatus;
  topicTitle: string;
  cards: CardNewsCardData[];
  caption: string | null;
};

export function DetailInsta({ contentId, draftId, status, topicTitle, cards, caption }: Props) {
  // CardNewsCardData (API) → CardNewsCard (id 보강). DetailInsta 는 read-only 라
  // 인덱스 기반 id 안전. prefix 로 안티패턴 시각적 신호 줄임 + 그리드/캡처가 같은
  // 객체 참조.
  const viewCards = cards.map((c, i) => ({ ...c, id: `card-${i}` }));

  const qc = useQueryClient();
  const regen = useMutation({
    mutationFn: () => draftsApi.regenerateCaption(draftId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: qk.drafts() });
      toast.success('캡션 생성 완료', { msg: '새 인스타 캡션으로 갱신됐어요.' });
    },
    onError: (e) => {
      toast.error('캡션 생성 실패', {
        msg: e instanceof ApiError ? e.message : '잠시 후 다시 시도해주세요.',
      });
    },
  });

  const hasCaption = caption !== null && caption.trim().length > 0;
  // 캡션 재생성은 ready draft 에서만. 양산 중(generating)엔 caption 이 reset 돼 빈 상태가
  // 보이는데, 이때 버튼을 누르면 백엔드가 'not ready' 로 막으므로 아예 비노출.
  const canRegen = status === 'ready';

  return (
    <div className="px-7 py-6 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] text-text-3">{cards.length}장 · 1080×1080</span>
        <div className="flex items-center gap-2">
          <PngExportButton cards={viewCards} topicTitle={topicTitle} />
          <Link
            href={routes.libraryItemEdit(contentId, 'insta')}
            className="inline-flex items-center gap-1.5 bg-text text-white rounded-md px-3 py-2 text-[12.5px] font-semibold hover:bg-black"
          >
            <Pencil className="w-3.5 h-3.5" /> 카드뉴스 편집
          </Link>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="py-16 text-[13px] text-text-3 text-center">카드뉴스 데이터가 없어요.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {viewCards.map((c, i) => (
            <CardNewsView key={c.id} card={c} idx={i} />
          ))}
        </div>
      )}

      <Panel
        title="캡션"
        actions={
          hasCaption && canRegen ? (
            <button
              type="button"
              onClick={() => regen.mutate()}
              disabled={regen.isPending}
              className="inline-flex items-center gap-1.5 text-[12px] text-text-2 hover:text-text disabled:opacity-50"
            >
              {regen.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCw className="w-3.5 h-3.5" />
              )}
              다시 생성
            </button>
          ) : undefined
        }
      >
        {hasCaption ? (
          <pre className="px-3.5 py-3 text-[12.5px] text-text-2 whitespace-pre-wrap font-sans leading-relaxed">
            {caption}
          </pre>
        ) : (
          <div className="px-3.5 py-6 flex flex-col items-center gap-3 text-center">
            {canRegen ? (
              <>
                <p className="text-[12.5px] text-text-3">캡션이 아직 없어요.</p>
                <button
                  type="button"
                  onClick={() => regen.mutate()}
                  disabled={regen.isPending}
                  className="inline-flex items-center gap-1.5 bg-text text-white rounded-md px-3 py-2 text-[12.5px] font-semibold hover:bg-black disabled:opacity-50"
                >
                  {regen.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  캡션 생성
                </button>
              </>
            ) : (
              <p className="text-[12.5px] text-text-3">
                {status === 'generating'
                  ? '양산이 끝나면 캡션이 채워져요.'
                  : '캡션을 생성하려면 먼저 양산을 완료해주세요.'}
              </p>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
