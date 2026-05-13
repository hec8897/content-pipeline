'use client';

type Props = {
  title: string;
  body: string;
  onTitleChange: (next: string) => void;
  onBodyChange: (next: string) => void;
};

export function BlogEditor({ title, body, onTitleChange, onBodyChange }: Props) {
  return (
    <div className="px-7 py-6">
      <div className="max-w-[720px] mx-auto bg-surface border border-border rounded-[10px] p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-wide text-text-3">제목</label>
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="bg-surface-2 border border-border rounded-md px-3 py-2 text-[14px] outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-wide text-text-3">
            본문 (마크다운)
          </label>
          <textarea
            rows={24}
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            className="bg-surface-2 border border-border rounded-md px-3 py-2 text-[12.5px] font-mono leading-relaxed outline-none focus:border-accent resize-y min-h-[480px]"
          />
        </div>
        <p className="text-[11px] text-text-3">
          첫 줄 = 제목으로 양산되며 마지막 줄에 해시태그가 붙어요. 마크다운 미리보기는 다음 단계에서 추가됩니다.
        </p>
      </div>
    </div>
  );
}
