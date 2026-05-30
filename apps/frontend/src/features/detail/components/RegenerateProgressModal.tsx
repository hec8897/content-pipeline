'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Modal } from '@/components/ui/Modal';
import { GenerateProgress } from '@/features/new-content/components/GenerateProgress';
import { useGenerateProgressSteps } from '@/features/new-content/hooks/useGenerateProgressSteps';
import { ApiError } from '@/lib/api/client';
import { draftsApi } from '@/lib/api/drafts';
import { qk } from '@/lib/api/queryKeys';
import { toast } from '@/lib/toast';

const LOG_LINES = [
  '[ai] 인터뷰 답변 정리',
  '[ai] 핵심 메시지 추출',
  '[ai] 카드뉴스 8장 생성 — gpt-5',
  '[ai] 블로그 본문 작성 (~1500자)',
  '[done] 양산 완료. 콘텐츠를 갱신합니다.',
];

type Props = {
  open: boolean;
  topicId: string;
  draftId: string;
  onClose: () => void;
  /** 양산 성공 시 (상위의 hasEdited reset 등) */
  onSuccess?: () => void;
};

export function RegenerateProgressModal({ open, topicId, draftId, onClose, onSuccess }: Props) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const firedRef = useRef(false);
  const { active, logs, start, complete, fail } = useGenerateProgressSteps(LOG_LINES);

  const { mutate } = useMutation({
    mutationFn: () => draftsApi.generate(topicId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: qk.drafts() });
      await qc.invalidateQueries({ queryKey: qk.draftInterview(draftId) });
      complete();
      toast.success('다시 양산 완료', { msg: '새 카드뉴스·블로그로 갱신됐어요.' });
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      fail();
      setError(err instanceof ApiError ? err.message : '알 수 없는 오류가 발생했어요');
    },
  });

  // 모달이 열릴 때 1회 양산 발사 + 상태 초기화. 닫히면 다음 open 을 위해 firedRef reset.
  useEffect(() => {
    if (!open) {
      firedRef.current = false;
      return;
    }
    if (firedRef.current) return;
    firedRef.current = true;
    setError(null);
    start();
    mutate();
  }, [open, mutate, start]);

  const handleRetry = () => {
    setError(null);
    start();
    mutate();
  };

  return (
    <Modal
      open={open}
      onClose={error ? onClose : () => {}}
      closeOnBackdrop={false}
      closeOnEscape={Boolean(error)}
    >
      <div className="py-2">
        <GenerateProgress active={active} logs={logs} error={error} onRetry={handleRetry} />
      </div>
    </Modal>
  );
}
