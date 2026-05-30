'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useNewContent } from '@/features/new-content/context';
import { GenerateProgress } from '@/features/new-content/components/GenerateProgress';
import { useGenerateProgressSteps } from '@/features/new-content/hooks/useGenerateProgressSteps';
import { ApiError } from '@/lib/api/client';
import { draftsApi } from '@/lib/api/drafts';
import { qk } from '@/lib/api/queryKeys';
import { routes } from '@/lib/routes';

const LOG_LINES = [
  '[ai] 인터뷰 답변 정리',
  '[ai] 핵심 메시지 추출',
  '[ai] 카드뉴스 8장 생성 — gpt-5',
  '[ai] 블로그 본문 작성 (~1500자)',
  '[done] 양산 완료. 편집 화면으로 이동합니다.',
];

export function GenerateController() {
  const router = useRouter();
  const qc = useQueryClient();
  const { topicId, session } = useNewContent();

  const [error, setError] = useState<string | null>(null);
  const firedRef = useRef(false);
  const { active, logs, start, complete, fail } = useGenerateProgressSteps(LOG_LINES);

  const mutation = useMutation({
    mutationFn: () => {
      if (!topicId) throw new Error('topicId 가 없습니다');
      return draftsApi.generate(topicId);
    },
    onSuccess: () => {
      if (!topicId) return;
      qc.invalidateQueries({ queryKey: qk.draft(topicId) });
      complete();
      router.push(routes.newEdit);
    },
    onError: (err) => {
      fail();
      setError(err instanceof ApiError ? err.message : '알 수 없는 오류가 발생했어요');
    },
  });

  const mutate = mutation.mutate;
  useEffect(() => {
    if (!topicId || (session && session.status === 'active')) {
      router.replace(routes.newContent);
      return;
    }
    if (firedRef.current) return;
    firedRef.current = true;
    start();
    mutate();
  }, [topicId, session, router, mutate, start]);

  const handleRetry = () => {
    setError(null);
    start();
    mutation.reset();
    mutation.mutate();
  };

  if (!topicId) return null;

  return <GenerateProgress active={active} logs={logs} error={error} onRetry={handleRetry} />;
}
