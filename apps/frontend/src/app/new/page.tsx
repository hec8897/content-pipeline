'use client';

import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useNewContent } from '@/features/new-content/context';
import { ApiError } from '@/lib/api/client';
import { topicsApi } from '@/lib/api/topics';
import { routes } from '@/lib/routes';

type Mode = 'interview' | 'skip';

export default function NewTopicPage() {
  const router = useRouter();
  const { topicTitle, setTopicTitle, setTopicId, setSession, setMessages } =
    useNewContent();
  const [pending, setPending] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = topicTitle.trim().length > 0 && pending === null;

  async function submit(mode: Mode) {
    if (!ready) return;
    setError(null);
    setPending(mode);
    try {
      const topic = await topicsApi.create(topicTitle.trim());
      setTopicId(topic.id);

      if (mode === 'interview') {
        const { session, messages } = await topicsApi.startInterview(topic.id);
        setSession(session);
        setMessages(messages);
        router.push(routes.newInterview);
      } else {
        const session = await topicsApi.skipInterview(topic.id);
        setSession(session);
        setMessages([]);
        router.push(routes.newGenerate);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '요청 처리에 실패했습니다');
      setPending(null);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-[680px] flex flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <span className="text-[11.5px] uppercase tracking-wider text-text-3 font-mono">
            STEP 01 · 주제
          </span>
          <h1
            className="text-[26px] sm:text-[30px] font-semibold text-text"
            style={{
              fontFamily: 'var(--font-serif)',
              letterSpacing: '-0.6px',
            }}
          >
            오늘 어떤 이야기를 풀어볼까요?
          </h1>
          <p className="text-[12.5px] text-text-2">
            한 줄이면 충분해요. 인터뷰로 깊이를 더할 수 있어요.
          </p>
        </div>

        <textarea
          rows={4}
          value={topicTitle}
          onChange={(e) => setTopicTitle(e.target.value)}
          placeholder="예: 5살 푸들을 입양한 한 달의 기록"
          disabled={pending !== null}
          className="bg-surface border border-border rounded-[10px] px-4 py-3 text-[15px] outline-none focus:border-accent resize-none disabled:opacity-60"
        />

        {error ? (
          <div className="text-[12px] text-red-500 bg-red-500/5 border border-red-500/30 rounded-md px-3 py-2">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <span className="text-[11.5px] text-text-3 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> 인터뷰를 받으면 본인 결 강한 콘텐츠가 나와요
          </span>
          <div className="ml-auto flex gap-2">
            {topicTitle.trim().length > 0 ? (
              <button
                type="button"
                onClick={() => submit('skip')}
                disabled={!ready}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-md text-[12.5px] border border-border text-text-2 hover:bg-surface-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {pending === 'skip' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : null}
                스킵하고 바로 만들기
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => submit('interview')}
              disabled={!ready}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[12.5px] font-semibold bg-text text-white hover:bg-black disabled:opacity-50 disabled:pointer-events-none"
            >
              {pending === 'interview' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  다음 <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
