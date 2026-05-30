'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { ChevronLeft, MoreHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { DetailHero } from '@/features/detail/components/DetailHero';
import { DetailTabs } from '@/features/detail/components/DetailTabs';
import { DetailOverview } from '@/features/detail/components/DetailOverview';
import { DetailInsta } from '@/features/detail/components/DetailInsta';
import { DetailBlog } from '@/features/detail/components/DetailBlog';
import { DetailActivity } from '@/features/detail/components/DetailActivity';
import { Button } from '@/components/ui/Button';
import { draftsApi } from '@/lib/api/drafts';
import { qk } from '@/lib/api/queryKeys';
import { draftToContent } from '@/lib/api/adapters';
import { routes } from '@/lib/routes';

export function DetailContent() {
  const { id } = useParams<{ id: string }>();
  const query = useQuery({
    queryKey: qk.drafts(),
    queryFn: () => draftsApi.list(),
  });
  const interviewQuery = useQuery({
    queryKey: qk.draftInterview(id),
    queryFn: () => draftsApi.getInterview(id),
    enabled: Boolean(id),
  });

  if (query.isLoading) {
    return <div className="px-7 py-16 text-[13px] text-text-3 text-center">불러오는 중…</div>;
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

  const content = draftToContent(draft);

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link href={routes.library} className="inline-flex items-center gap-1 hover:text-text">
            <ChevronLeft className="w-3 h-3" /> 라이브러리
          </Link>
        }
        title={content.title}
        actions={
          <Button variant="ghost">
            <MoreHorizontal className="w-3.5 h-3.5" /> 더보기
          </Button>
        }
      />
      <DetailHero content={content} />
      <DetailTabs
        panels={{
          overview: (
            <DetailOverview
              content={content}
              draftId={id}
              interview={interviewQuery.data ?? null}
              interviewLoading={interviewQuery.isLoading}
            />
          ),
          insta: (
            <DetailInsta
              contentId={content.id}
              topicTitle={draft.topic.title}
              cards={draft.card_news ?? []}
            />
          ),
          blog: (
            <DetailBlog
              contentId={content.id}
              title={draft.blog_title}
              body={draft.blog_body}
              tags={draft.blog_tags}
            />
          ),
          activity: <DetailActivity />,
        }}
      />
    </>
  );
}
