'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useNewContent } from '@/features/new-content/context';
import {
  GENERATE_STEPS,
  GenerateProgress,
} from '@/features/new-content/components/GenerateProgress';
import { ApiError } from '@/lib/api/client';
import { draftsApi } from '@/lib/api/drafts';
import { qk } from '@/lib/api/queryKeys';
import { routes } from '@/lib/routes';

const STEP_INTERVAL_MS = 8000;

const LOG_LINES = [
  '[ai] 인터뷰 답변 정리',
  '[ai] 핵심 메시지 추출',
  '[ai] 카드뉴스 8장 생성 — gemini-2.5-flash',
  '[ai] 블로그 본문 작성 (~1500자)',
  '[done] 양산 완료. 편집 화면으로 이동합니다.',
];

export function GenerateController() {
  const router = useRouter();
  const qc = useQueryClient();
  const { topicId, session } = useNewContent();

  const [active, setActive] = useState(1);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const firedRef = useRef(false);

  const mutation = useMutation({
    mutationFn: () => {
      if (!topicId) throw new Error('topicId 가 없습니다');
      return draftsApi.generate(topicId);
    },
    onSuccess: () => {
      if (!topicId) return;
      qc.invalidateQueries({ queryKey: qk.draft(topicId) });
      setActive(GENERATE_STEPS.length);
      setLogs((prev) => [...prev, LOG_LINES[LOG_LINES.length - 1]]);
      router.push(routes.newEdit);
    },
    onError: (err) => {
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
    setLogs([LOG_LINES[0]]);
    mutate();
  }, [topicId, session, router, mutate]);

  useEffect(() => {
    if (!mutation.isPending) return;
    const id = setInterval(() => {
      setActive((a) => Math.min(a + 1, GENERATE_STEPS.length));
      setLogs((prev) => {
        const next = LOG_LINES[prev.length];
        if (!next) return prev;
        if (next.startsWith('[done]')) return prev;
        return [...prev, next];
      });
    }, STEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [mutation.isPending]);

  const handleRetry = () => {
    setError(null);
    setActive(1);
    setLogs([LOG_LINES[0]]);
    mutation.reset();
    mutation.mutate();
  };

  if (!topicId) return null;

  return <GenerateProgress active={active} logs={logs} error={error} onRetry={handleRetry} />;
}
