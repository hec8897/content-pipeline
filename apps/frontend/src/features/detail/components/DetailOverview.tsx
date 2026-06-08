import { useState } from 'react';
import { ArrowUpRight, Pencil, RotateCw, Download, Copy, Archive } from 'lucide-react';
import type { Content } from '@/types';
import type { InterviewSummary } from '@/lib/api/types';
import { Panel } from '@/components/ui/Panel';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { Sparkline } from '@/components/ui/Sparkline';
import { SPARKLINE_DATA } from '@/mocks';
import { formatNumber } from '@/lib/format';
import { confirm } from '@/lib/confirm';
import { AnswerEditModal, type AnswerEditTarget } from './AnswerEditModal';
import { RegenerateProgressModal } from './RegenerateProgressModal';

const channelInfo = {
  naver: {
    name: '네이버 블로그',
    url: 'blog.naver.com/minji.daily',
  },
  insta: {
    name: '인스타그램',
    url: 'instagram.com/minji.daily',
  },
} as const;

const actions = [
  { icon: Pencil, label: '편집' },
  { icon: RotateCw, label: '다시 발행' },
  { icon: Download, label: '이미지 ZIP 다운로드' },
  { icon: Copy, label: '복제' },
  { icon: Archive, label: '보관함으로' },
];

const tags = ['#성견입양', '#1인가구', '#푸들', '#반려견일상', '#적응기'];

const PREVIEW_COUNT = 3;

export function DetailOverview({
  content,
  draftId,
  topicId,
  interview,
  interviewLoading = false,
}: {
  content: Content;
  draftId: string;
  topicId: string;
  interview: InterviewSummary | null;
  interviewLoading?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editTarget, setEditTarget] = useState<AnswerEditTarget | null>(null);
  // 답변을 한 번이라도 수정했을 때만 단독 "다시 양산" 버튼을 노출 (양산 완료 시 reset).
  const [hasEdited, setHasEdited] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const qa = interview?.qa ?? [];
  const remainingCount = Math.max(qa.length - PREVIEW_COUNT, 0);
  const visibleQa = expanded ? qa : qa.slice(0, PREVIEW_COUNT);

  // M — 수정한 인터뷰로 카드뉴스/블로그 재생성. confirm(경고) → 진행 모달 open.
  async function runRegenerate() {
    if (regenOpen) return;
    const ok = await confirm({
      kind: 'unsaved',
      title: '수정한 인터뷰로 다시 양산할까요?',
      description: '현재 카드뉴스·블로그는 새 결과로 덮어써져요. (버전 보관 X)',
      confirmLabel: '다시 양산',
      cancelLabel: '취소',
    });
    if (!ok) return;
    setRegenOpen(true);
  }

  return (
    <div className="px-7 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
      <div className="flex flex-col gap-5 min-w-0">
        <Panel title="채널별 결과">
          <div className="flex flex-col">
            {content.channels.map((ch) => {
              const info = channelInfo[ch];
              return (
                <div
                  key={ch}
                  className="flex items-center gap-3 px-3.5 py-3 border-t border-border first:border-t-0"
                >
                  <ChannelIcon channel={ch} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-text">{info.name}</div>
                    <a
                      href={`https://${info.url}`}
                      className="inline-flex items-center gap-0.5 text-[11.5px] text-accent font-mono hover:underline"
                    >
                      {info.url} <ArrowUpRight className="w-3 h-3" />
                    </a>
                    <div className="text-[11px] text-text-3 mt-0.5">발행 {content.publishedAt}</div>
                  </div>
                  <div className="hidden sm:flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[14px] font-semibold text-text">
                        {formatNumber(content.views)}
                      </div>
                      <div className="text-[10px] text-text-3">조회</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[14px] font-semibold text-text">
                        {formatNumber(content.likes)}
                      </div>
                      <div className="text-[10px] text-text-3">좋아요</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[14px] font-semibold text-text">12</div>
                      <div className="text-[10px] text-text-3">공유</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel
          title="원본 인터뷰"
          sub={qa.length > 0 ? `${qa.length}개 질문` : undefined}
        >
          {interviewLoading ? (
            <div className="px-3.5 py-6 text-[12px] text-text-3">불러오는 중…</div>
          ) : qa.length === 0 ? (
            <div className="px-3.5 py-6 text-[12px] text-text-3">
              인터뷰 기록이 없어요.
            </div>
          ) : (
            <div className="flex flex-col">
              {visibleQa.map((item, i) => (
                <button
                  type="button"
                  key={item.questionId}
                  onClick={() =>
                    setEditTarget({
                      questionId: item.questionId,
                      questionNo: i + 1,
                      question: item.question,
                      answer: item.answer ?? '',
                    })
                  }
                  aria-label={`Q${i + 1} 답변 편집`}
                  className="group w-full text-left px-3.5 py-3 border-t border-border first:border-t-0 flex flex-col gap-1 cursor-pointer hover:bg-surface-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-mono text-text-3 uppercase">Q{i + 1}</span>
                    <Pencil className="w-3 h-3 text-text-3 opacity-0 group-hover:opacity-100" />
                  </div>
                  <p className="text-[13px] font-medium text-text">{item.question}</p>
                  <p className="text-[12px] text-text-2">
                    {item.answer ?? <span className="text-text-3">답변 없음 · 클릭해 추가</span>}
                  </p>
                </button>
              ))}
              {remainingCount > 0 && (
                <button
                  onClick={() => setExpanded((prev) => !prev)}
                  className="border-t border-border px-3.5 py-2.5 text-[11.5px] text-text-2 hover:bg-surface-2 text-left"
                >
                  {expanded ? '접기 ↑' : `나머지 ${remainingCount}개 질문 보기 →`}
                </button>
              )}
              {hasEdited && (
                <button
                  onClick={() => void runRegenerate()}
                  disabled={regenOpen}
                  className="border-t border-border px-3.5 py-2.5 text-[11.5px] font-medium text-accent hover:bg-surface-2 text-left flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RotateCw className="w-3 h-3 shrink-0" />
                  수정한 인터뷰로 다시 양산
                </button>
              )}
            </div>
          )}
        </Panel>
      </div>

      <div className="flex flex-col gap-5">
        <Panel title="액션">
          <div className="flex flex-col">
            {actions.map((a) => (
              <button
                key={a.label}
                className="flex items-center gap-2 px-3.5 py-2.5 border-t border-border first:border-t-0 text-[12.5px] text-text-2 hover:bg-surface-2 hover:text-text text-left"
              >
                <a.icon className="w-[18px] h-[18px] shrink-0" />
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="성과 추이" sub="7일">
          <div className="px-3.5 py-3">
            <Sparkline data={SPARKLINE_DATA} height={56} />
            <div className="flex justify-between mt-2 text-[10px] font-mono text-text-3">
              <span>5/01</span>
              <span>5/04</span>
              <span>5/07</span>
            </div>
          </div>
        </Panel>

        <Panel title="태그">
          <div className="px-3.5 py-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 rounded-full text-[11px] bg-surface-2 text-text-2 border border-border"
              >
                {t}
              </span>
            ))}
          </div>
        </Panel>
      </div>

      {interview && (
        <AnswerEditModal
          open={editTarget !== null}
          onClose={() => setEditTarget(null)}
          draftId={draftId}
          sessionId={interview.sessionId}
          target={editTarget}
          onSaved={() => setHasEdited(true)}
          onSaveAndRegenerate={() => void runRegenerate()}
        />
      )}

      <RegenerateProgressModal
        open={regenOpen}
        topicId={topicId}
        draftId={draftId}
        onClose={() => setRegenOpen(false)}
        onSuccess={() => setHasEdited(false)}
      />
    </div>
  );
}
