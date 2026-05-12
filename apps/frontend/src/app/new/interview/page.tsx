'use client';

import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { useNewContent } from '@/features/new-content/context';
import { ApiError } from '@/lib/api/client';
import { interviewApi } from '@/lib/api/interview';
import { routes } from '@/lib/routes';
import type { InterviewMessage } from '@/lib/api/types';

const MIN_USER_TURNS = 3;
const MAX_USER_TURNS = 8;

export default function NewInterviewPage() {
  const router = useRouter();
  const {
    topicId,
    session,
    messages,
    setMessages,
    setSession,
  } = useNewContent();

  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!topicId || !session || session.status !== 'active') {
      router.replace(routes.newContent);
    }
  }, [topicId, session, router]);

  const latestAssistant = useMemo(
    () => [...messages].reverse().find((m) => m.role === 'assistant'),
    [messages],
  );
  const userTurns = useMemo(
    () => messages.filter((m) => m.role === 'user').length,
    [messages],
  );

  if (!topicId || !session || session.status !== 'active' || !latestAssistant) {
    return null;
  }

  const progress = Math.min(((userTurns + 1) / MAX_USER_TURNS) * 100, 100);
  const canSubmit = draft.trim().length > 0 && !pending;
  const canStop = userTurns >= MIN_USER_TURNS && !pending;

  async function submit() {
    const content = draft.trim();
    if (!content || !session || !latestAssistant) return;

    setDraft('');
    setError(null);
    setPending(true);

    const tempId = `temp-${Date.now()}`;
    const optimistic: InterviewMessage = {
      id: tempId,
      session_id: session.id,
      turn: latestAssistant.turn,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await interviewApi.answer(session.id, content);
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== tempId);
        return res.kind === 'next'
          ? [...without, res.userMessage, res.assistantMessage]
          : [...without, res.userMessage];
      });
      if (res.kind === 'done') {
        setSession(res.session);
        router.push(routes.newReview);
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(content);
      setError(err instanceof ApiError ? err.message : '답변 전송에 실패했습니다');
    } finally {
      setPending(false);
    }
  }

  async function stop() {
    if (!session || !canStop) return;
    setError(null);
    setPending(true);
    try {
      const completed = await interviewApi.stop(session.id);
      setSession(completed);
      router.push(routes.newReview);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '인터뷰 종료에 실패했습니다');
      setPending(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col px-5 py-6">
      <div className="max-w-[720px] w-full mx-auto mb-8 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11.5px] text-text-3 font-mono">
          <span>
            Q{userTurns + 1} / 최대 {MAX_USER_TURNS}
          </span>
          <span>최소 {MIN_USER_TURNS}답 이상이면 종료할 수 있어요</span>
        </div>
        <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-[680px] flex flex-col gap-6">
          {pending ? (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col items-center justify-center gap-3 py-6 min-h-[88px]"
            >
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-[14px] text-text-2">
                AI 가 다음 질문을 만들고 있어요…
              </p>
            </div>
          ) : (
            <h2 className="text-[20px] sm:text-[22px] font-semibold text-text leading-snug">
              {latestAssistant.content}
            </h2>
          )}
          {pending ? null : (
            <>
              <textarea
                rows={5}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="답변을 입력해주세요"
                className="bg-surface border border-border rounded-[10px] px-4 py-3 text-[14px] outline-none focus:border-accent resize-none"
              />

              {error ? (
                <div className="text-[12px] text-red-500 bg-red-500/5 border border-red-500/30 rounded-md px-3 py-2">
                  {error}
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                {canStop ? (
                  <button
                    type="button"
                    onClick={stop}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] text-accent border border-accent hover:bg-accent-soft"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> 충분해요 → 리뷰
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={submit}
                  disabled={!canSubmit}
                  className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[12.5px] font-semibold bg-text text-white hover:bg-black disabled:opacity-40"
                >
                  다음 <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
