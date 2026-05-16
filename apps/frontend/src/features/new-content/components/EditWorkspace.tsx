'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Loader2, RotateCw } from 'lucide-react';

import { useNewContent } from '@/features/new-content/context';
import { BlogEditor } from '@/features/new-content/components/BlogEditor';
import { AutosaveIndicator } from '@/features/new-content/components/AutosaveIndicator';
import { useDraftAutosave } from '@/features/new-content/hooks/useDraftAutosave';
import { CardNewsEditor } from '@/features/detail/components/CardNewsEditor';
import { ApiError } from '@/lib/api/client';
import { draftsApi } from '@/lib/api/drafts';
import { qk } from '@/lib/api/queryKeys';
import { routes } from '@/lib/routes';
import type { Draft, DraftWithTopic } from '@/lib/api/types';

const TABS = [
  { key: 'insta', label: '인스타 카드뉴스' },
  { key: 'blog', label: '네이버 블로그' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function EditWorkspace() {
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

  const autosave = useDraftAutosave({
    draft,
    initialSavedAtIso: draft.generated_at,
    onPatched: (updated) =>
      qc.setQueryData<DraftWithTopic>(qk.draft(topicId), (prev) =>
        prev ? { ...prev, draft: updated } : prev,
      ),
  });

  const onPublishClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!autosave.isDirtyOrPending) return;
    if (!autosave.confirmDiscardIfDirty()) {
      e.preventDefault();
      return;
    }
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
            status={autosave.autosaveStatus}
            savedAgo={autosave.savedAgo}
            onRetry={autosave.retry}
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
        <CardNewsEditor
          draftId={draft.id}
          initial={autosave.initialCards}
          onChange={autosave.setCards}
        />
      ) : (
        <BlogEditor
          title={autosave.blogTitle}
          body={autosave.blogBody}
          tags={autosave.blogTags}
          onTitleChange={autosave.setBlogTitle}
          onBodyChange={autosave.setBlogBody}
          onTagsChange={autosave.setBlogTags}
        />
      )}
    </div>
  );
}
