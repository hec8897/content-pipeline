import Link from 'next/link';
import { Eye, Heart, MessageSquare, Pencil } from 'lucide-react';
import { NAVER_BLOG_BODY, NAVER_BLOG_TITLE } from '@/mocks';
import { routes } from '@/lib/routes';

function renderMarkdown(md: string) {
  const lines = md.split('\n');
  const out: React.ReactNode[] = [];
  let para: string[] = [];
  let key = 0;

  const flush = () => {
    if (para.length === 0) return;
    const text = para.join(' ');
    out.push(
      <p
        key={key++}
        className="my-3 text-[14px] leading-[1.85] text-text"
        dangerouslySetInnerHTML={{
          __html: text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'),
        }}
      />,
    );
    para = [];
  };

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flush();
      out.push(
        <h2 key={key++} className="mt-6 mb-2 text-[18px] font-bold text-text">
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith('> ')) {
      flush();
      out.push(
        <blockquote
          key={key++}
          className="my-4 pl-3 border-l-2 border-naver text-[14px] text-text-2 italic"
        >
          {line.slice(2)}
        </blockquote>,
      );
    } else if (line.startsWith('- ')) {
      flush();
      out.push(
        <li key={key++} className="text-[14px] leading-[1.85] text-text">
          <span
            dangerouslySetInnerHTML={{
              __html: line.slice(2).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'),
            }}
          />
        </li>,
      );
    } else if (line.trim() === '') {
      flush();
    } else if (line.startsWith('#')) {
      flush();
      out.push(
        <p key={key++} className="my-3 text-[12.5px] text-naver font-medium">
          {line}
        </p>,
      );
    } else {
      para.push(line);
    }
  }
  flush();
  return out;
}

type Props = { contentId: string };

export function DetailBlog({ contentId }: Props) {
  return (
    <div className="px-7 py-6 flex flex-col gap-4">
      <div className="max-w-[720px] mx-auto w-full flex items-center justify-between gap-3">
        <span className="text-[12px] text-text-3">네이버 블로그 미리보기</span>
        <Link
          href={routes.libraryItemEdit(contentId, 'blog')}
          className="inline-flex items-center gap-1.5 bg-text text-white rounded-md px-3 py-2 text-[12.5px] font-semibold hover:bg-black"
        >
          <Pencil className="w-3.5 h-3.5" /> 블로그 편집
        </Link>
      </div>
      <article className="max-w-[720px] mx-auto bg-surface border border-border rounded-[10px] overflow-hidden">
        <header className="bg-naver text-white px-5 py-3 flex items-center gap-2 text-[12.5px] font-semibold">
          <span>NAVER 블로그</span>
          <span className="ml-auto opacity-80 font-mono text-[11px]">
            blog.naver.com/minji.daily
          </span>
        </header>
        <div className="px-6 pt-5 pb-2 flex items-center justify-between">
          <span className="text-[11.5px] font-medium text-naver">#일상 / 반려동물</span>
          <span className="text-[11px] text-text-3">이웃 1,247명</span>
        </div>
        <div className="px-6 pt-3 pb-5 border-b border-border">
          <h1 className="text-[22px] font-bold text-text leading-tight">{NAVER_BLOG_TITLE}</h1>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-text-3">
            <span>2026.05.07</span>
            <span className="inline-flex items-center gap-1">
              <Eye className="w-3 h-3" /> 1,284
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="w-3 h-3" /> 96
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> 8
            </span>
          </div>
        </div>
        <div className="px-6 py-5 prose-sm">{renderMarkdown(NAVER_BLOG_BODY)}</div>
      </article>
    </div>
  );
}
