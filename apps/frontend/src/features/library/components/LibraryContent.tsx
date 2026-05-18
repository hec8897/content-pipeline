'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { LibraryGrid } from '@/features/library/components/LibraryGrid';
import { draftsApi } from '@/lib/api/drafts';
import { qk } from '@/lib/api/queryKeys';
import { draftToContent } from '@/lib/api/adapters';
import { routes } from '@/lib/routes';

export function LibraryContent() {
  const query = useQuery({
    queryKey: qk.drafts(),
    queryFn: () => draftsApi.list(),
  });

  const items = (query.data ?? []).map(draftToContent);
  const counts = items.reduce<Record<string, number>>((acc, p) => {
    acc[p.state] = (acc[p.state] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="라이브러리"
        subtitle={`총 ${items.length}개 · 발행됨 ${counts.live ?? 0}, 예약됨 ${counts.scheduled ?? 0}, 초안 ${counts.draft ?? 0}, 실패 ${counts.failed ?? 0}`}
      />
      <div className="px-7 py-6">
        {query.isLoading ? (
          <div className="text-[13px] text-text-3 text-center py-16">불러오는 중…</div>
        ) : query.isError ? (
          <div className="text-[13px] text-text-3 text-center py-16">
            콘텐츠를 불러오지 못했어요.{' '}
            <button onClick={() => query.refetch()} className="text-accent hover:underline">
              다시 시도
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-[13px] text-text-3 text-center py-16">
            아직 콘텐츠가 없어요.{' '}
            <Link href={routes.newContent} className="text-accent hover:underline">
              + 새 콘텐츠로 시작해보세요
            </Link>
          </div>
        ) : (
          <LibraryGrid items={items} />
        )}
      </div>
    </>
  );
}
