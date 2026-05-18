'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = {
  title: string;
  body: string;
};

const META = { author: 'minji_daily', date: '2026. 5. 7.', category: '일상' };

export function MarkdownPreview({ title, body }: Props) {
  return (
    <div className="bg-surface w-full max-w-[640px] mx-auto px-7 pt-6 pb-10">
      <h1
        className={`text-[20px] font-bold leading-[1.4] tracking-[-0.3px] ${
          title ? 'text-text' : 'text-text-3'
        }`}
      >
        {title || '제목을 입력하세요'}
      </h1>

      <div className="mt-2 text-[11px] text-text-2 font-mono">
        {META.author} · {META.date} · {META.category}
      </div>

      <div className="my-4 border-t border-border" />

      <div className="text-[14px] leading-[1.85] text-text mp-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h2 className="text-[18px] font-bold text-text mt-6 mb-3 leading-tight">
                {children}
              </h2>
            ),
            h2: ({ children }) => (
              <h3 className="text-[16.5px] font-bold text-text mt-5 mb-2.5 leading-tight">
                {children}
              </h3>
            ),
            h3: ({ children }) => (
              <h4 className="text-[15px] font-bold text-text mt-4 mb-2 leading-tight">
                {children}
              </h4>
            ),
            p: ({ children }) => <p className="my-3 whitespace-pre-line">{children}</p>,
            ul: ({ children }) => <ul className="my-3 pl-1 flex flex-col gap-1">{children}</ul>,
            ol: ({ children }) => (
              <ol className="my-3 pl-5 list-decimal flex flex-col gap-1">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="flex gap-2 items-start">
                <span className="text-naver leading-[1.85]">•</span>
                <span className="flex-1">{children}</span>
              </li>
            ),
            blockquote: ({ children }) => (
              <blockquote className="my-4 border-l-[3px] border-naver bg-[#f7faf8] italic text-text-2 px-4 py-2">
                {children}
              </blockquote>
            ),
            strong: ({ children }) => (
              <strong className="font-bold text-text">{children}</strong>
            ),
            em: ({ children }) => <em className="italic">{children}</em>,
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-naver underline underline-offset-2"
              >
                {children}
              </a>
            ),
            code: ({ children }) => (
              <code className="bg-surface-2 text-text px-1 py-[1px] rounded text-[13px] font-mono">
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <pre className="my-3 bg-text text-white rounded-md p-3 overflow-auto text-[12.5px] font-mono leading-relaxed">
                {children}
              </pre>
            ),
            hr: () => <hr className="my-5 border-t border-border" />,
            table: ({ children }) => (
              <div className="my-4 overflow-auto">
                <table className="w-full border-collapse text-[13px]">{children}</table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border border-border bg-surface-2 px-2 py-1.5 text-left font-semibold">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-border px-2 py-1.5 align-top">{children}</td>
            ),
          }}
        >
          {body}
        </ReactMarkdown>
      </div>
    </div>
  );
}
