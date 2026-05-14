'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Panel } from '@/components/ui/Panel';
import { RecentWorkRow } from '@/features/home/components/RecentWorkRow';
import { draftsApi } from '@/lib/api/drafts';
import { qk } from '@/lib/api/queryKeys';
import { draftToContent } from '@/lib/api/adapters';
import { routes } from '@/lib/routes';

export function RecentWorkPanel() {
  const query = useQuery({
    queryKey: qk.drafts(),
    queryFn: () => draftsApi.list(),
  });

  const drafts = query.data ?? [];
  const recent = drafts.slice(0, 5).map(draftToContent);

  return (
    <Panel
      title="최근 작업"
      sub={`${drafts.length}개`}
      actions={
        <Link href={routes.library} className="text-[11.5px] text-text-2 hover:text-text">
          전체 보기 →
        </Link>
      }
    >
      {query.isLoading ? (
        <div className="px-3.5 py-6 text-[12px] text-text-3 text-center">불러오는 중…</div>
      ) : query.isError ? (
        <div className="px-3.5 py-6 text-[12px] text-text-3 text-center">
          콘텐츠를 불러오지 못했어요.{' '}
          <button onClick={() => query.refetch()} className="text-accent hover:underline">
            다시 시도
          </button>
        </div>
      ) : recent.length === 0 ? (
        <div className="px-3.5 py-6 text-[12px] text-text-3 text-center">
          아직 콘텐츠가 없어요.{' '}
          <Link href={routes.newContent} className="text-accent hover:underline">
            + 새 콘텐츠
          </Link>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {recent.map((c) => (
            <RecentWorkRow key={c.id} content={c} />
          ))}
        </div>
      )}
    </Panel>
  );
}
