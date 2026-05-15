'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Loader2 } from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';
import { DetailHero } from '@/features/detail/components/DetailHero';
import { BlogEditor } from '@/features/new-content/components/BlogEditor';
import { AutosaveIndicator } from '@/features/new-content/components/AutosaveIndicator';
import { useDraftAutosave } from '@/features/new-content/hooks/useDraftAutosave';
import { CardNewsEditor } from '@/features/detail/components/CardNewsEditor';
import { draftsApi } from '@/lib/api/drafts';
import { qk } from '@/lib/api/queryKeys';
import { draftToContent } from '@/lib/api/adapters';
import { routes } from '@/lib/routes';
import type { DraftListItem } from '@/lib/api/types';

type EditMode = 'insta' | 'blog';

export function LibraryItemEditContent() {
  const params = useParams<{ id: string; mode: string }>();
  const id = params.id;
  const mode = params.mode;

  if (mode !== 'insta' && mode !== 'blog') notFound();

  const query = useQuery({
    queryKey: qk.drafts(),
    queryFn: () => draftsApi.list(),
  });

  if (query.isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="px-7 py-16 text-[13px] text-text-3 text-center">
        콘텐츠를 불러오지 못했어요.{' '}
        <button onClick={() => query.refetch()} className="text-accent hover:underline">
          다시 시도
        </button>
      </div>
    );
  }

  const draft = query.data?.find((d) => d.id === id);
  if (!draft) notFound();

  if (draft.status !== 'ready') {
    return (
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[520px] bg-surface-2 border border-border rounded-[10px] p-5 flex flex-col gap-3 items-start">
          <div className="text-[14px] font-semibold text-text">아직 편집할 수 없어요</div>
          <p className="text-[12.5px] text-text-2">
            상태: <code className="font-mono">{draft.status}</code>. 양산이 완료된 콘텐츠만 편집
            가능합니다.
          </p>
          <Link
            href={routes.libraryItem(draft.id)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12.5px] font-semibold bg-text text-white hover:bg-black"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> 상세로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return <Editor draft={draft} mode={mode as EditMode} />;
}

function Editor({ draft, mode }: { draft: DraftListItem; mode: EditMode }) {
  const qc = useQueryClient();

  const autosave = useDraftAutosave({
    draft,
    initialSavedAtIso: draft.updated_at,
    onPatched: (updated) =>
      qc.setQueryData<DraftListItem[]>(qk.drafts(), (prev) =>
        prev?.map((d) =>
          d.id === draft.id
            ? {
                ...d,
                blog_title: updated.blog_title,
                blog_body: updated.blog_body,
                blog_tags: updated.blog_tags,
                card_news: updated.card_news,
                status: updated.status,
                updated_at: updated.updated_at,
              }
            : d,
        ) ?? prev,
      ),
  });

  const onCloseClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!autosave.confirmDiscardIfDirty()) e.preventDefault();
  };

  const content = draftToContent(draft);
  const tabLabel = mode === 'blog' ? '네이버 블로그 편집' : '카드뉴스 편집';

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link
            href={routes.libraryItem(draft.id)}
            className="inline-flex items-center gap-1 hover:text-text"
          >
            <ChevronLeft className="w-3 h-3" /> {content.title}
          </Link>
        }
        title={`${content.title} — 편집 중`}
        actions={
          <>
            <AutosaveIndicator
              status={autosave.autosaveStatus}
              savedAgo={autosave.savedAgo}
              onRetry={autosave.retry}
            />
            <Link
              href={routes.libraryItem(draft.id)}
              onClick={onCloseClick}
              className="inline-flex items-center gap-1.5 border border-border rounded-md px-3 py-2 text-[12.5px] text-text-2 hover:bg-surface-2"
            >
              닫기
            </Link>
          </>
        }
      />
      <DetailHero content={content} />
      <div className="border-b border-border bg-surface px-7">
        <div className="flex items-center gap-5">
          <span className="relative py-3 text-[12.5px] text-text font-semibold">
            {tabLabel}
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-text" />
          </span>
        </div>
      </div>
      {mode === 'blog' ? (
        <BlogEditor
          title={autosave.blogTitle}
          body={autosave.blogBody}
          tags={autosave.blogTags}
          onTitleChange={autosave.setBlogTitle}
          onBodyChange={autosave.setBlogBody}
          onTagsChange={autosave.setBlogTags}
        />
      ) : (
        <CardNewsEditor initial={autosave.initialCards} onChange={autosave.setCards} />
      )}
    </>
  );
}
