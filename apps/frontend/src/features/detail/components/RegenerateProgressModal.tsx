'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Modal } from '@/components/ui/Modal';
import {
  GENERATE_STEPS,
  GenerateProgress,
} from '@/features/new-content/components/GenerateProgress';
import { ApiError } from '@/lib/api/client';
import { draftsApi } from '@/lib/api/drafts';
import { qk } from '@/lib/api/queryKeys';
import { toast } from '@/lib/toast';

// new-content 의 GenerateController 와 동일한 시간 기반 스텝 진행. 백엔드 generate 는
// 단일 호출이라 실제 스텝 신호가 없어, 8초 간격으로 스텝/로그를 진행하는 시늉을 한다.
const STEP_INTERVAL_MS = 8000;
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
  const [active, setActive] = useState(1);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const firedRef = useRef(false);

  const mutation = useMutation({
    mutationFn: () => draftsApi.generate(topicId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: qk.drafts() });
      await qc.invalidateQueries({ queryKey: qk.draftInterview(draftId) });
      setActive(GENERATE_STEPS.length);
      toast.success('다시 양산 완료', { msg: '새 카드뉴스·블로그로 갱신됐어요.' });
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : '알 수 없는 오류가 발생했어요');
    },
  });

  const mutate = mutation.mutate;

  // 모달이 열릴 때 1회 양산 발사 + 상태 초기화. 닫히면 다음 open 을 위해 firedRef reset.
  useEffect(() => {
    if (!open) {
      firedRef.current = false;
      return;
    }
    if (firedRef.current) return;
    firedRef.current = true;
    setActive(1);
    setLogs([LOG_LINES[0]]);
    setError(null);
    mutate();
  }, [open, mutate]);

  // 진행 중 스텝/로그를 시간 기반으로 advance.
  useEffect(() => {
    if (!mutation.isPending) return;
    const id = setInterval(() => {
      setActive((a) => Math.min(a + 1, GENERATE_STEPS.length));
      setLogs((prev) => {
        const next = LOG_LINES[prev.length];
        if (!next || next.startsWith('[done]')) return prev;
        return [...prev, next];
      });
    }, STEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [mutation.isPending]);

  const handleRetry = () => {
    setError(null);
    setActive(1);
    setLogs([LOG_LINES[0]]);
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
