'use client';

import { useState } from 'react';
import { CharGuide } from './CharGuide';
import { HashtagChips } from './HashtagChips';
import { MarkdownPreview } from './MarkdownPreview';

const TITLE_RECOMMEND = 28;

const MONO_STACK =
  'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

type Props = {
  title: string;
  body: string;
  tags: string[];
  onTitleChange: (next: string) => void;
  onBodyChange: (next: string) => void;
  onTagsChange: (next: string[]) => void;
};

type MobileView = 'edit' | 'preview';

export function BlogEditor({
  title,
  body,
  tags,
  onTitleChange,
  onBodyChange,
  onTagsChange,
}: Props) {
  const [mobileView, setMobileView] = useState<MobileView>('edit');

  return (
    <div className="px-5 md:px-7 py-5 md:py-6 flex flex-col gap-5">
      {/* 상단 행: 제목 + 해시태그 */}
      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-4 md:gap-5">
        {/* 제목 */}
        <div className="flex flex-col gap-1.5">
          <FieldHeader label="제목" hint="네이버 검색 노출에 가장 중요" />
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="제목을 입력하세요"
            className="bg-surface border border-border rounded-md px-3 py-2.5 text-[14px] font-semibold tracking-[-0.2px] outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)] transition-shadow placeholder:text-text-3 placeholder:font-normal"
          />
          <div className="flex items-center justify-between text-[10.5px] font-mono text-text-3">
            <span>{title.length}자</span>
            <span className={title.length > TITLE_RECOMMEND ? 'text-warn' : undefined}>
              권장 {TITLE_RECOMMEND}자 이내
            </span>
          </div>
        </div>

        {/* 해시태그 */}
        <div className="flex flex-col gap-1.5">
          <FieldHeader
            label="해시태그"
            hint="검색 노출에 도움"
            right={
              <span className="text-[10.5px] font-mono text-text-3">{tags.length}개</span>
            }
          />
          <HashtagChips tags={tags} onChange={onTagsChange} />
          <div className="text-[10.5px] font-mono text-text-3">
            Enter · 콤마 · Space 로 추가
          </div>
        </div>
      </div>

      {/* 모바일 segmented toggle */}
      <div className="md:hidden">
        <MobileToggle value={mobileView} onChange={setMobileView} />
      </div>

      {/* 하단 행: 본문 + 프리뷰 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {/* 본문 */}
        <section
          className={`flex flex-col border border-border rounded-md bg-surface overflow-hidden ${
            mobileView === 'preview' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <PaneHeader
            label="본문"
            sub="Markdown"
            right={
              <span className="hidden lg:inline text-[10.5px] font-mono text-text-3">
                <span className="text-text-2 font-semibold">**굵게</span>{'   '}
                <span className="text-text-2 font-semibold">## H2</span>{'   '}
                <span className="text-text-2 font-semibold">&gt; 인용</span>{'   '}
                <span className="text-text-2 font-semibold">- 목록</span>
              </span>
            }
          />
          <textarea
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            spellCheck={false}
            placeholder="여기에 본문을 작성하세요. 마크다운을 지원합니다."
            style={{
              fontFamily: MONO_STACK,
              tabSize: 2,
              lineHeight: 1.7,
            }}
            className="flex-1 min-h-[480px] resize-none bg-surface text-[12.5px] text-text px-4 py-4 outline-none placeholder:text-text-3"
          />
          <CharGuide count={body.length} />
        </section>

        {/* 프리뷰 */}
        <section
          className={`flex flex-col border border-border rounded-md bg-surface overflow-hidden ${
            mobileView === 'edit' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <PaneHeader
            label="프리뷰"
            sub="네이버 블로그 톤"
            right={
              <span className="inline-flex items-center gap-1 text-[10.5px] font-mono font-bold text-naver">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-naver" />
                live
              </span>
            }
          />
          <div className="flex-1 min-h-[480px] overflow-auto">
            <MarkdownPreview title={title} body={body} />
          </div>
        </section>
      </div>
    </div>
  );
}

function FieldHeader({
  label,
  hint,
  right,
}: {
  label: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.6px] text-text-2">
          {label}
        </span>
        {hint ? (
          <span className="text-[10.5px] font-mono text-text-3">{hint}</span>
        ) : null}
      </div>
      {right}
    </div>
  );
}

function PaneHeader({
  label,
  sub,
  right,
}: {
  label: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border bg-surface-2">
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.6px] text-text-2">
          {label}
        </span>
        {sub ? (
          <span className="text-[10.5px] font-mono text-text-3">{sub}</span>
        ) : null}
      </div>
      {right}
    </header>
  );
}

function MobileToggle({
  value,
  onChange,
}: {
  value: MobileView;
  onChange: (next: MobileView) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-0.5 p-0.5 bg-surface-2 border border-border rounded-md">
      {(
        [
          { key: 'edit' as const, label: '본문 편집 · MD' },
          { key: 'preview' as const, label: '프리뷰 · 네이버' },
        ] as const
      ).map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`px-3 py-1.5 rounded text-[12px] font-semibold transition-colors ${
              active
                ? 'bg-surface text-text shadow-sm'
                : 'bg-transparent text-text-2 hover:text-text'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
