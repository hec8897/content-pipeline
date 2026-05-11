'use client';

import { ArrowRight, Check, Loader2, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { useNewContent } from '@/features/new-content/context';
import { ApiError } from '@/lib/api/client';
import { interviewApi } from '@/lib/api/interview';
import { routes } from '@/lib/routes';
import type { InterviewMessage } from '@/lib/api/types';

interface QAPair {
  turn: number;
  question: InterviewMessage;
  answer: InterviewMessage | null;
}

function groupByTurn(messages: InterviewMessage[]): QAPair[] {
  const byTurn = new Map<number, QAPair>();
  for (const m of messages) {
    const existing = byTurn.get(m.turn);
    if (m.role === 'assistant') {
      byTurn.set(m.turn, {
        turn: m.turn,
        question: m,
        answer: existing?.answer ?? null,
      });
    } else if (existing) {
      byTurn.set(m.turn, { ...existing, answer: m });
    }
  }
  return [...byTurn.values()].sort((a, b) => a.turn - b.turn);
}

export default function NewReviewPage() {
  const router = useRouter();
  const { session, messages, setMessages } = useNewContent();

  useEffect(() => {
    if (!session || session.status === 'active') {
      router.replace(routes.newContent);
    }
  }, [session, router]);

  const pairs = useMemo(() => groupByTurn(messages), [messages]);

  if (!session || session.status === 'active') {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col items-center px-5 py-10">
      <div className="w-full max-w-[760px] flex flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <span className="text-[11.5px] uppercase tracking-wider text-text-3 font-mono">
            STEP 02.5 · 인터뷰 리뷰
          </span>
          <h1
            className="text-[26px] sm:text-[30px] font-semibold text-text"
            style={{ fontFamily: 'var(--font-serif)', letterSpacing: '-0.6px' }}
          >
            답변을 다듬을 시간이에요
          </h1>
          <p className="text-[12.5px] text-text-2">
            마음에 들지 않는 답변은 수정해도 좋아요. 양산 단계에서 그대로 글감이 됩니다.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {pairs.map((pair) => (
            <QACard
              key={pair.turn}
              pair={pair}
              sessionId={session.id}
              onUpdated={(updated) =>
                setMessages((prev) =>
                  prev.map((m) => (m.id === updated.id ? updated : m)),
                )
              }
            />
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => router.push(routes.newGenerate)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[12.5px] font-semibold bg-text text-white hover:bg-black"
          >
            양산하기 <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface QACardProps {
  pair: QAPair;
  sessionId: string;
  onUpdated: (m: InterviewMessage) => void;
}

function QACard({ pair, sessionId, onUpdated }: QACardProps) {
  const original = pair.answer?.content ?? '';
  const [draft, setDraft] = useState(original);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = draft !== original;

  async function save() {
    if (!pair.answer || !dirty) return;
    setError(null);
    setSaving(true);
    try {
      const updated = await interviewApi.patchMessage(
        sessionId,
        pair.answer.id,
        draft,
      );
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-surface border border-border rounded-[12px] p-4 flex flex-col gap-3">
      <div className="flex items-start gap-2 text-[13px] text-text-2">
        <span className="text-[11px] font-mono text-text-3 mt-0.5">Q{pair.turn}</span>
        <span className="flex-1">{pair.question.content}</span>
      </div>
      {pair.answer ? (
        <>
          <textarea
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={saving}
            className="bg-bg border border-border rounded-[8px] px-3 py-2 text-[13.5px] outline-none focus:border-accent resize-none disabled:opacity-60"
          />
          {error ? (
            <div className="text-[11.5px] text-red-500">{error}</div>
          ) : null}
          {dirty ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11.5px] border border-accent text-accent hover:bg-accent-soft disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                저장
              </button>
            </div>
          ) : (
            <div className="text-[11px] text-text-3 inline-flex items-center gap-1">
              <Pencil className="w-3 h-3" /> 본문 수정 시 저장 버튼이 나타나요
            </div>
          )}
        </>
      ) : (
        <div className="text-[12px] text-text-3 italic">답변이 비어 있어요</div>
      )}
    </div>
  );
}
