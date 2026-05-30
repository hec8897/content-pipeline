'use client';

import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { interviewApi } from '@/lib/api/interview';
import { qk } from '@/lib/api/queryKeys';
import { toast } from '@/lib/toast';

export type AnswerEditTarget = {
  /** 질문(assistant) 메시지 id (= K 응답의 questionId). 답변 유무와 무관하게 항상 존재. */
  questionId: string;
  /** 화면 표시용 Q 번호 (1-based) */
  questionNo: number;
  question: string;
  /** 기존 답변. "답변 없음" 이면 빈 문자열. */
  answer: string;
};

type AnswerEditModalProps = {
  open: boolean;
  onClose: () => void;
  draftId: string;
  sessionId: string;
  target: AnswerEditTarget | null;
  /** 답변 저장(PATCH)이 성공할 때마다 호출 — 상위의 hasEdited 추적용. */
  onSaved?: () => void;
  /**
   * 저장 성공 후 "다시 양산" 흐름으로 이어갈 때 호출 (M 단계).
   * 지정하면 "저장 후 다시 양산" 버튼이 추가로 노출된다.
   */
  onSaveAndRegenerate?: (newAnswer: string) => void;
};

export function AnswerEditModal({
  open,
  onClose,
  draftId,
  sessionId,
  target,
  onSaved,
  onSaveAndRegenerate,
}: AnswerEditModalProps) {
  const titleId = useId();
  const queryClient = useQueryClient();
  const [value, setValue] = useState('');

  // target(또는 open) 이 바뀌면 textarea 를 해당 답변으로 재동기화.
  // effect 대신 render 중 setState — open→close→open 도 reset 됨.
  const activeId = open ? (target?.questionId ?? null) : null;
  const [syncedId, setSyncedId] = useState<string | null>(null);
  if (activeId !== syncedId) {
    setSyncedId(activeId);
    setValue(open && target ? target.answer : '');
  }

  const isAdding = target ? target.answer.trim().length === 0 : false;

  const mutation = useMutation({
    mutationFn: (content: string) => {
      if (!target) throw new Error('편집 대상이 없습니다.');
      return interviewApi.upsertAnswer(sessionId, target.questionId, content);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.draftInterview(draftId) });
    },
  });

  const trimmed = value.trim();
  const dirty = target ? trimmed !== target.answer.trim() : false;
  const canSave = dirty && trimmed.length > 0 && !mutation.isPending;

  const handleSave = (then?: (newAnswer: string) => void) => {
    if (!canSave) return;
    mutation.mutate(trimmed, {
      onSuccess: () => {
        onSaved?.();
        onClose();
        if (then) {
          then(trimmed);
        } else {
          toast.success(isAdding ? '답변을 추가했어요' : '답변을 수정했어요', {
            msg: '개요의 인터뷰 기록이 갱신됐어요.',
          });
        }
      },
      onError: () => {
        toast.error(isAdding ? '답변 추가 실패' : '답변 수정 실패', {
          msg: '잠시 후 다시 시도해주세요.',
        });
      },
    });
  };

  return (
    <Modal
      open={open}
      onClose={mutation.isPending ? () => {} : onClose}
      ariaLabelledBy={titleId}
      closeOnBackdrop={!mutation.isPending}
      closeOnEscape={!mutation.isPending}
    >
      {/* Body */}
      <div className="px-[22px] pb-2 pt-[22px]">
        <div className="flex items-start gap-[14px]">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]"
            style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
            aria-hidden
          >
            <Pencil size={17} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.6px]"
              style={{ color: 'var(--color-accent)' }}
            >
              {isAdding ? '답변 추가' : '답변 수정'} {target ? `· Q${target.questionNo}` : ''}
            </div>
            <h2
              id={titleId}
              className="text-text mt-1 text-[15px] font-semibold leading-[1.4] tracking-[-0.3px]"
            >
              {target?.question ?? ''}
            </h2>
          </div>
        </div>

        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={5}
          disabled={mutation.isPending}
          placeholder="답변을 입력해주세요."
          className="border-border focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)] mt-3.5 w-full resize-y rounded-md border bg-white px-3 py-2.5 text-[13px] leading-[1.6] outline-none transition-shadow disabled:opacity-50"
        />
      </div>

      {/* Footer */}
      <div
        className="border-border mt-2 flex items-center justify-end gap-2 rounded-b-[12px] border-t px-[22px] py-4"
        style={{ background: 'var(--color-bg)' }}
      >
        <span className="text-text-3 mr-auto hidden font-mono text-[10.5px] sm:inline">
          ESC 로 닫기
        </span>
        <Button variant="ghost" size="md" onClick={onClose} disabled={mutation.isPending}>
          취소
        </Button>
        {onSaveAndRegenerate ? (
          <Button
            variant="ghost"
            size="md"
            onClick={() => handleSave(onSaveAndRegenerate)}
            disabled={!canSave}
          >
            저장 후 다시 양산
          </Button>
        ) : null}
        <Button variant="primary" size="md" onClick={() => handleSave()} disabled={!canSave}>
          {mutation.isPending ? '저장 중…' : '저장'}
        </Button>
      </div>
    </Modal>
  );
}
