'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Loader2 } from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';
import { DetailHero } from '@/features/detail/components/DetailHero';
import { BlogEditor } from '@/features/new-content/components/BlogEditor';
import {
  AutosaveIndicator,
  type AutosaveStatus,
} from '@/features/new-content/components/AutosaveIndicator';
import { CardNewsEditor } from '@/features/detail/components/CardNewsEditor';
import { draftsApi } from '@/lib/api/drafts';
import { qk } from '@/lib/api/queryKeys';
import { draftToContent } from '@/lib/api/adapters';
import { routes } from '@/lib/routes';
import type { CardNewsCardData, DraftListItem } from '@/lib/api/types';
import type { CardNewsCard } from '@/types';

type EditMode = 'insta' | 'blog';

const AUTOSAVE_DEBOUNCE_MS = 800;

function toEditorCards(cards: CardNewsCardData[]): CardNewsCard[] {
  return cards.map((c, i) => ({
    ...c,
    id: c.type === 'body' ? `body-${c.num ?? i}` : `${c.type}-${i}`,
  }));
}

function fromEditorCards(cards: CardNewsCard[]): CardNewsCardData[] {
  return cards.map((c) => {
    const { id, ...rest } = c;
    void id;
    return rest;
  });
}

function formatSavedAgo(savedAt: number, now: number): string {
  const diffSec = Math.max(0, Math.floor((now - savedAt) / 1000));
  if (diffSec < 10) return '방금';
  if (diffSec < 60) return `${diffSec}초 전`;
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  return `${hour}시간 전`;
}

export default function LibraryItemEditPage() {
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

  const initialCards = useMemo(
    () => toEditorCards(draft.card_news ?? []),
    // 마운트 시점 한 번만 — 저장 후에도 local 우선.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [cards, setCards] = useState<CardNewsCard[]>(initialCards);
  const [blogTitle, setBlogTitle] = useState(draft.blog_title ?? '');
  const [blogBody, setBlogBody] = useState(draft.blog_body ?? '');
  const [blogTags, setBlogTags] = useState<string[]>(draft.blog_tags);
  const [dirty, setDirty] = useState(false);

  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<number>(() => new Date(draft.updated_at).getTime());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const savedAgo = formatSavedAgo(lastSavedAt, now);

  const pendingChangeRef = useRef(false);

  const mutation = useMutation({
    mutationFn: () =>
      draftsApi.patch(draft.id, {
        card_news: fromEditorCards(cards),
        blog_title: blogTitle,
        blog_body: blogBody,
        blog_tags: blogTags,
      }),
    onMutate: () => {
      setAutosaveStatus('saving');
    },
    onSuccess: (updated) => {
      // 리스트 캐시의 해당 row 만 갱신 — 라이브러리/대시보드/상세 모두 즉시 반영.
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
      );
      setDirty(false);
      setLastSavedAt(Date.now());
      setAutosaveStatus('saved');
      if (pendingChangeRef.current) {
        pendingChangeRef.current = false;
        setDirty(true);
      }
    },
    onError: () => {
      setAutosaveStatus('failed');
    },
  });
  const { mutate, isPending } = mutation;

  // 변경 감지 → 800ms idle 후 PATCH.
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      if (isPending) {
        pendingChangeRef.current = true;
      } else {
        mutate();
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [dirty, blogTitle, blogBody, blogTags, cards, isPending, mutate]);

  // 이탈 가드.
  useEffect(() => {
    if (!dirty && !isPending) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, isPending]);

  const onCloseClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!dirty && !isPending) return;
    const ok = window.confirm('저장 중인 변경 사항이 있어요. 그대로 이동할까요?');
    if (!ok) e.preventDefault();
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
              status={autosaveStatus}
              savedAgo={savedAgo}
              onRetry={() => !isPending && mutate()}
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
          title={blogTitle}
          body={blogBody}
          tags={blogTags}
          onTitleChange={(v) => {
            setBlogTitle(v);
            setDirty(true);
          }}
          onBodyChange={(v) => {
            setBlogBody(v);
            setDirty(true);
          }}
          onTagsChange={(v) => {
            setBlogTags(v);
            setDirty(true);
          }}
        />
      ) : (
        <CardNewsEditor
          initial={initialCards}
          onChange={(next) => {
            setCards(next);
            setDirty(true);
          }}
        />
      )}
    </>
  );
}
