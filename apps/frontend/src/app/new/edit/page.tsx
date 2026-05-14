'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Loader2, RotateCw } from 'lucide-react';

import { useNewContent } from '@/features/new-content/context';
import { BlogEditor } from '@/features/new-content/components/BlogEditor';
import {
  AutosaveIndicator,
  type AutosaveStatus,
} from '@/features/new-content/components/AutosaveIndicator';
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

const AUTOSAVE_DEBOUNCE_MS = 800;

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

function formatSavedAgo(savedAt: number, now: number): string {
  const diffSec = Math.max(0, Math.floor((now - savedAt) / 1000));
  if (diffSec < 10) return '방금';
  if (diffSec < 60) return `${diffSec}초 전`;
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  return `${hour}시간 전`;
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
  const router = useRouter();
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
  const [blogTags, setBlogTags] = useState<string[]>(draft.blog_tags);
  const [dirty, setDirty] = useState(false);

  // Autosave 표시 상태. 양산 직후라 첫 표시는 'saved' / generated_at 기준.
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<number>(() =>
    draft.generated_at ? new Date(draft.generated_at).getTime() : Date.now(),
  );
  // 매 초 갱신 — `방금 → X초 전 → X분 전` 자연 진행.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const savedAgo = formatSavedAgo(lastSavedAt, now);

  // mutation in-flight 중 새 변경이 들어오면 onSuccess 후 한 번 더 발사.
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
      qc.setQueryData<DraftWithTopic>(qk.draft(topicId), (prev) =>
        prev ? { ...prev, draft: updated } : prev,
      );
      setDirty(false);
      setLastSavedAt(Date.now());
      setAutosaveStatus('saved');
      if (pendingChangeRef.current) {
        pendingChangeRef.current = false;
        // 다음 tick 에 dirty 가 다시 true 가 되도록 — useEffect 가 다음 debounce 사이클 시작
        setDirty(true);
      }
    },
    onError: () => {
      setAutosaveStatus('failed');
      // dirty 유지 — 재시도 클릭 또는 다음 변경 시 자동 재발사.
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

  // 페이지 이탈 가드 — 브라우저 표준 confirm.
  useEffect(() => {
    if (!dirty && !isPending) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, isPending]);

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
  const onBlogTagsChange = (next: string[]) => {
    setBlogTags(next);
    setDirty(true);
  };

  const onRetrySave = () => {
    if (isPending) return;
    mutate();
  };

  const onPublishClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!dirty && !isPending) return;
    const ok = window.confirm('저장 중인 변경 사항이 있어요. 그대로 이동할까요?');
    if (!ok) {
      e.preventDefault();
      return;
    }
    // 사용자가 OK — 이탈 진행. 단, dirty 가 있어도 unsaved 가 됨(서버 미반영).
    router.push(routes.newPublish);
    e.preventDefault();
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

        <div className="ml-auto flex items-center gap-3">
          <AutosaveIndicator
            status={autosaveStatus}
            savedAgo={savedAgo}
            onRetry={onRetrySave}
          />
          <Link
            href={routes.newPublish}
            onClick={onPublishClick}
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
          tags={blogTags}
          onTitleChange={onBlogTitleChange}
          onBodyChange={onBlogBodyChange}
          onTagsChange={onBlogTagsChange}
        />
      )}
    </div>
  );
}
