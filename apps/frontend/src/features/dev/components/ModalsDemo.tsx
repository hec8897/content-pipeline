'use client';

import { useState } from 'react';

import { ConfirmDetailPanel } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { confirm, confirmUnsaved } from '@/lib/confirm';

type LogEntry = { id: number; label: string; result: string };

/**
 * Task C 검증용 데모 — confirm() / confirmUnsaved() helper 로 6 variants 트리거.
 * 결과(resolve 값)를 로그에 찍어 Promise 동작까지 눈으로 확인.
 * (Toast 4 variants 는 Task D 완료 후 이 페이지에 추가)
 */
export function ModalsDemo() {
  const [log, setLog] = useState<LogEntry[]>([]);

  const push = (label: string, result: string) =>
    setLog((prev) => [{ id: Date.now() + Math.random(), label, result }, ...prev].slice(0, 12));

  const triggers: Array<{ key: string; label: string; desc: string; run: () => Promise<void> }> = [
    {
      key: 'publish',
      label: 'publish',
      desc: '발행 확인 — primary tone + detail panel',
      run: async () => {
        const ok = await confirm({
          kind: 'publish',
          title: '지금 발행할까요?',
          description: '선택한 채널에 카드뉴스 1건과 블로그 글 1건이 즉시 게시됩니다.',
          detail: (
            <ConfirmDetailPanel
              items={[
                { key: '채널', value: '인스타그램 · 네이버 블로그' },
                { key: '카드뉴스', value: '6장' },
                { key: '블로그', value: '1편 (1,820자)' },
              ]}
            />
          ),
          confirmLabel: '지금 발행',
        });
        push('publish', ok ? 'true (발행)' : 'false (취소)');
      },
    },
    {
      key: 'delete',
      label: 'delete',
      desc: 'danger tone + type-guard (정확히 입력해야 활성화)',
      run: async () => {
        const ok = await confirm({
          kind: 'delete',
          title: '이 콘텐츠를 영구 삭제할까요?',
          description: '삭제 후에는 복구할 수 없습니다. 발행된 게시물은 채널에서 별도로 내려야 합니다.',
          typeGuard: { expected: 'DELETE 여름-카드뉴스' },
          confirmLabel: '영구 삭제',
        });
        push('delete', ok ? 'true (삭제)' : 'false (취소)');
      },
    },
    {
      key: 'schedule',
      label: 'schedule',
      desc: 'warn eyebrow + children 폼 슬롯 (날짜/시간/채널)',
      run: async () => {
        const ok = await confirm({
          kind: 'schedule',
          title: '예약 발행을 설정할까요?',
          description: '지정한 시각에 자동으로 게시됩니다.',
          children: (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-text-3 font-mono text-[10.5px] uppercase tracking-[0.5px]">
                    날짜
                  </span>
                  <input
                    type="date"
                    defaultValue="2026-06-01"
                    className="border-border rounded-md border bg-white px-2.5 py-2 text-[12.5px] outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-text-3 font-mono text-[10.5px] uppercase tracking-[0.5px]">
                    시간
                  </span>
                  <input
                    type="time"
                    defaultValue="09:00"
                    className="border-border rounded-md border bg-white px-2.5 py-2 text-[12.5px] outline-none"
                  />
                </label>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-text-3 font-mono text-[10.5px] uppercase tracking-[0.5px]">
                  채널
                </span>
                <div className="flex flex-wrap gap-3 text-[12.5px]">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" defaultChecked /> 인스타그램
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" defaultChecked /> 네이버 블로그
                  </label>
                </div>
              </div>
            </div>
          ),
          confirmLabel: '예약 설정',
        });
        push('schedule', ok ? 'true (예약)' : 'false (취소)');
      },
    },
    {
      key: 'retry',
      label: 'retry',
      desc: '발행 실패 — danger eyebrow + primary 재시도 버튼',
      run: async () => {
        const ok = await confirm({
          kind: 'retry',
          title: '발행에 실패했어요. 다시 시도할까요?',
          description: '네트워크 오류로 게시가 중단되었습니다.',
          detail: (
            <ConfirmDetailPanel
              items={[
                { key: '채널', value: '인스타그램' },
                { key: '실패 시각', value: '22:31' },
                { key: '오류', value: 'Graph API 504' },
              ]}
            />
          ),
          confirmLabel: '다시 시도',
        });
        push('retry', ok ? 'true (재시도)' : 'false (취소)');
      },
    },
    {
      key: 'unsaved',
      label: 'unsaved (3-way)',
      desc: '미저장 변경 — 저장 / 변경 버리기 / 취소 3갈래',
      run: async () => {
        const result = await confirmUnsaved({
          title: '저장하지 않은 변경이 있어요.',
          description: '이 화면을 떠나면 편집 중인 내용이 사라집니다.',
          confirmLabel: '저장',
          tertiaryLabel: '변경 버리기',
        });
        push('unsaved', result === null ? 'null (취소)' : `'${result}'`);
      },
    },
    {
      key: 'disconnect',
      label: 'disconnect',
      desc: '채널 연결 해제 — danger tone',
      run: async () => {
        const ok = await confirm({
          kind: 'disconnect',
          title: '네이버 블로그 연결을 해제할까요?',
          description: '재발행하려면 다시 로그인해 연결해야 합니다.',
          confirmLabel: '연결 해제',
        });
        push('disconnect', ok ? 'true (해제)' : 'false (취소)');
      },
    },
  ];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <div className="text-text-3 font-mono text-[11px] uppercase tracking-[0.6px]">
          dev · Phase 7.5
        </div>
        <h1 className="text-text mt-1 text-[22px] font-semibold tracking-[-0.4px]">
          ConfirmDialog 데모
        </h1>
        <p className="text-text-2 mt-1.5 text-[13.5px] leading-[1.6]">
          6개 variant 를 트리거하고 resolve 값을 아래 로그에서 확인하세요. Escape / 배경 클릭 / 취소
          시 cancel 로 resolve 됩니다. <span className="text-text-3">(Toast 는 Task D 이후 추가)</span>
        </p>
      </header>

      <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {triggers.map((t) => (
          <div
            key={t.key}
            className="border-border flex flex-col gap-2.5 rounded-[10px] border p-4"
            style={{ background: 'var(--color-surface)' }}
          >
            <div>
              <div className="text-text font-mono text-[12px] font-semibold">{t.label}</div>
              <div className="text-text-2 mt-1 text-[12px] leading-[1.5]">{t.desc}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void t.run()} className="self-start">
              트리거
            </Button>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <div className="text-text-3 mb-2 font-mono text-[10.5px] uppercase tracking-[0.6px]">
          resolve 로그
        </div>
        <div
          className="border-border min-h-[120px] rounded-[10px] border p-3"
          style={{ background: 'var(--color-bg)' }}
        >
          {log.length === 0 ? (
            <div className="text-text-3 text-[12.5px]">아직 없음 — 위 버튼을 눌러보세요.</div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {log.map((e) => (
                <li key={e.id} className="flex items-center gap-2 font-mono text-[12px]">
                  <span className="text-text-2">{e.label}</span>
                  <span className="text-text-3">→</span>
                  <span className="text-text font-semibold">{e.result}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
