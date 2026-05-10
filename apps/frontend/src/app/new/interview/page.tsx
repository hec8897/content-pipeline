'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { useNewContent } from '@/features/new-content/context';
import { INTERVIEW_QUESTIONS } from '@/mocks';
import { routes } from '@/lib/routes';

const MIN_Q = 3;
const MAX_Q = 8;

export default function NewInterviewPage() {
  const router = useRouter();
  const { answers, setAnswer } = useNewContent();
  const [idx, setIdx] = useState(0);

  const total = Math.min(INTERVIEW_QUESTIONS.length, MAX_Q);
  const qa = INTERVIEW_QUESTIONS[idx];
  const value = answers[idx] ?? '';
  const canGoNext = value.trim().length > 0;
  const reachedMin = idx + 1 >= MIN_Q;

  const goNext = () => {
    if (idx + 1 >= total) {
      router.push(routes.newGenerate);
      return;
    }
    setIdx(idx + 1);
  };
  const goPrev = () => idx > 0 && setIdx(idx - 1);
  const finish = () => router.push(routes.newGenerate);

  const progress = ((idx + 1) / total) * 100;

  return (
    <div className="flex-1 flex flex-col px-5 py-6">
      {/* progress */}
      <div className="max-w-[720px] w-full mx-auto mb-8 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11.5px] text-text-3 font-mono">
          <span>
            Q{idx + 1} / {total} <span className="text-text-3">(선택)</span>
          </span>
          <span>
            최소 {MIN_Q} · 최대 {MAX_Q}
          </span>
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
          <h2 className="text-[20px] sm:text-[22px] font-semibold text-text leading-snug">
            {qa.q}
          </h2>
          <textarea
            rows={5}
            value={value}
            onChange={(e) => setAnswer(idx, e.target.value)}
            placeholder={qa.placeholder ?? '답변을 입력해주세요'}
            className="bg-surface border border-border rounded-[10px] px-4 py-3 text-[14px] outline-none focus:border-accent resize-none"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              disabled={idx === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] border border-border text-text-2 disabled:opacity-30"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> 이전
            </button>

            {reachedMin && (
              <button
                onClick={finish}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] text-accent border border-accent hover:bg-accent-soft"
              >
                <Sparkles className="w-3.5 h-3.5" /> 충분해요 → 양산
              </button>
            )}

            <button
              onClick={goNext}
              disabled={!canGoNext}
              className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[12.5px] font-semibold bg-text text-white hover:bg-black disabled:opacity-40"
            >
              {idx + 1 >= total ? '양산하기' : '다음'} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
