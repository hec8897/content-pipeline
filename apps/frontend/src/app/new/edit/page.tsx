'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Loader2, RotateCw } from 'lucide-react';

import { useNewContent } from '@/features/new-content/context';
import { BlogEditor } from '@/features/new-content/components/BlogEditor';
import { CardNewsEditor } from '@/features/detail/components/CardNewsEditor';
import { ApiError } from '@/lib/api/client';
import { draftsApi } from '@/lib/api/drafts';
import { qk } from '@/lib/api/queryKeys';
import { routes } from '@/lib/routes';
import type { CardNewsCardData, Draft, DraftWithTopic } from '@/lib/api/types';
import type { CardNewsCard } from '@/types';

const TABS = [
  { key: 'insta', label: '인스타 카드뉴스' },
  { key: 'blog', label: '네이버 블로그' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// 백엔드는 카드 식별자가 위치(인덱스/num) — frontend dnd 용 id 를 부여한다.
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

export default function NewEditPage() {
  const router = useRouter();
  const { topicId } = useNewContent();

  useEffect(() => {
    if (!topicId) router.replace(routes.newContent);
  }, [topicId, router]);

  const query = useQuery({
    queryKey: topicId ? qk.draft(topicId) : ['draft', 'noop'],
    queryFn: () => draftsApi.get(topicId!),
    enabled: !!topicId,
  });

  // draft 가 없는 케이스(직접 URL 진입) — 양산 페이지로. render 중 router.replace 호출은
  // React 안티패턴(다른 컴포넌트의 state 업데이트)이라 effect 로 분리.
  const draftMissing = query.data?.draft === null;
  useEffect(() => {
    if (draftMissing) router.replace(routes.newGenerate);
  }, [draftMissing, router]);

  if (!topicId) return null;

  if (query.isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (query.isError) {
    const message =
      query.error instanceof ApiError ? query.error.message : '양산 결과를 불러오지 못했어요';
    return <ErrorPanel message={message} />;
  }

  const data = query.data as DraftWithTopic;

  if (!data.draft) {
    // 위 useEffect 가 다음 tick 에 router.replace 처리. 그 사이 빈 화면.
    return null;
  }

  if (data.draft.status === 'failed') {
    return (
      <ErrorPanel
        message={data.draft.error_reason ?? '양산이 실패한 상태예요'}
        showRetry
        onRetry={() => router.push(routes.newGenerate)}
      />
    );
  }

  if (data.draft.status !== 'ready') {
    // generating/pending — sync 라 보통 도달 X. 안전망.
    return (
      <div className="flex-1 flex items-center justify-center text-[12.5px] text-text-2">
        양산 결과를 준비 중입니다…
      </div>
    );
  }

  return <DraftEditor draft={data.draft} topicId={topicId} />;
}

function ErrorPanel({
  message,
  showRetry,
  onRetry,
}: {
  message: string;
  showRetry?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-[520px] bg-red-500/5 border border-red-500/30 rounded-[10px] p-5 flex flex-col gap-3 items-start">
        <div className="text-[14px] font-semibold text-red-500">편집을 시작할 수 없어요</div>
        <p className="text-[12.5px] text-text-2 whitespace-pre-line">{message}</p>
        {showRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12.5px] font-semibold bg-text text-white hover:bg-black"
          >
            <RotateCw className="w-3.5 h-3.5" /> 다시 양산하기
          </button>
        ) : null}
      </div>
    </div>
  );
}

function DraftEditor({ draft, topicId }: { draft: Draft; topicId: string }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>('insta');

  const initialCards = useMemo(
    () => toEditorCards(draft.card_news ?? []),
    // 마운트 시점 한 번만 — 저장 후에도 local 우선.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [cards, setCards] = useState<CardNewsCard[]>(initialCards);
  const [blogTitle, setBlogTitle] = useState(draft.blog_title ?? '');
  const [blogBody, setBlogBody] = useState(draft.blog_body ?? '');
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      draftsApi.patch(draft.id, {
        card_news: fromEditorCards(cards),
        blog_title: blogTitle,
        blog_body: blogBody,
      }),
    onSuccess: (updated) => {
      qc.setQueryData<DraftWithTopic>(qk.draft(topicId), (prev) =>
        prev ? { ...prev, draft: updated } : prev,
      );
      setDirty(false);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : '저장에 실패했어요');
    },
  });

  const onCardsChange = (next: CardNewsCard[]) => {
    setCards(next);
    setDirty(true);
  };

  const onBlogTitleChange = (next: string) => {
    setBlogTitle(next);
    setDirty(true);
  };

  const onBlogBodyChange = (next: string) => {
    setBlogBody(next);
    setDirty(true);
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b border-border bg-surface px-7 flex items-center gap-5">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative py-3 text-[12.5px] ${
                active ? 'text-text font-semibold' : 'text-text-2 hover:text-text'
              }`}
            >
              {t.label}
              {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-text" />}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          {error ? <span className="text-[11.5px] text-red-500">{error}</span> : null}
          {dirty ? (
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12.5px] text-text border border-border hover:bg-surface-2 disabled:opacity-50"
            >
              {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              변경 사항 저장
            </button>
          ) : null}
          <Link
            href={routes.newPublish}
            className="inline-flex items-center gap-1.5 bg-text text-white rounded-md px-3.5 py-2 text-[12.5px] font-semibold hover:bg-black"
          >
            다음 — 발행 <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {tab === 'insta' ? (
        <CardNewsEditor initial={initialCards} onChange={onCardsChange} />
      ) : (
        <BlogEditor
          title={blogTitle}
          body={blogBody}
          onTitleChange={onBlogTitleChange}
          onBodyChange={onBlogBodyChange}
        />
      )}
    </div>
  );
}
