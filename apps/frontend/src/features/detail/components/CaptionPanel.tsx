'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, RotateCw, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Panel } from '@/components/ui/Panel';
import { ApiError } from '@/lib/api/client';
import { draftsApi } from '@/lib/api/drafts';
import { qk } from '@/lib/api/queryKeys';
import { toast } from '@/lib/toast';
import type { DraftStatus } from '@/lib/api/types';

type Props = {
  draftId: string;
  status: DraftStatus;
  caption: string | null;
};

// 인스타 캡션 표시 + AI 재생성. 표시는 read-only(직접 편집 X), 재생성만 가능.
// caption/재생성 로직을 DetailInsta 에서 분리해 자체 소유.
export function CaptionPanel({ draftId, status, caption }: Props) {
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
  // 재생성은 ready draft 에서만. 양산 중(generating)엔 caption 이 reset 돼 빈 상태가 보이는데,
  // 이때 버튼을 누르면 백엔드가 'not ready' 로 막으므로 아예 비노출.
  const canRegen = status === 'ready';

  return (
    <Panel
      title="캡션"
      actions={
        hasCaption && canRegen ? (
          <RegenButton
            variant="ghost"
            icon={RotateCw}
            label="다시 생성"
            pending={regen.isPending}
            onClick={() => regen.mutate()}
          />
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
              <RegenButton
                variant="primary"
                icon={Sparkles}
                label="캡션 생성"
                pending={regen.isPending}
                onClick={() => regen.mutate()}
              />
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
  );
}

// 생성/다시생성 버튼 공유 — pending 스피너 + 아이콘/라벨/스타일만 variant 로 분기.
function RegenButton({
  variant,
  icon: Icon,
  label,
  pending,
  onClick,
}: {
  variant: 'primary' | 'ghost';
  icon: LucideIcon;
  label: string;
  pending: boolean;
  onClick: () => void;
}) {
  const styles =
    variant === 'primary'
      ? 'bg-text text-white rounded-md px-3 py-2 text-[12.5px] font-semibold hover:bg-black'
      : 'text-[12px] text-text-2 hover:text-text';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`inline-flex items-center gap-1.5 disabled:opacity-50 ${styles}`}
    >
      {pending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Icon className="w-3.5 h-3.5" />
      )}
      {label}
    </button>
  );
}
