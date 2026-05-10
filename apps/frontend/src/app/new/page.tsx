'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useNewContent } from '@/features/new-content/context';
import { routes } from '@/lib/routes';

export default function NewTopicPage() {
  const { topic, setTopic } = useNewContent();
  const ready = topic.trim().length > 0;

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
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="예: 5살 푸들을 입양한 한 달의 기록"
          className="bg-surface border border-border rounded-[10px] px-4 py-3 text-[15px] outline-none focus:border-accent resize-none"
        />

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <span className="text-[11.5px] text-text-3 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> 인터뷰를 받으면 본인 결 강한 콘텐츠가 나와요
          </span>
          <div className="ml-auto flex gap-2">
            <Link
              href={routes.newGenerate}
              className={`inline-flex items-center gap-1 px-3.5 py-2 rounded-md text-[12.5px] border border-border text-text-2 hover:bg-surface-2 ${
                ready ? '' : 'opacity-50 pointer-events-none'
              }`}
            >
              스킵하고 바로 만들기
            </Link>
            <Link
              href={routes.newInterview}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[12.5px] font-semibold bg-text text-white hover:bg-black ${
                ready ? '' : 'opacity-50 pointer-events-none'
              }`}
            >
              다음 <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
