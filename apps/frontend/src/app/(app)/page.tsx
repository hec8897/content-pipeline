'use client';

import Link from 'next/link';
import { Plus, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { Stat } from '@/components/ui/Stat';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { RecentWorkRow } from '@/features/home/components/RecentWorkRow';
import { ChannelStat } from '@/features/home/components/ChannelStat';
import { draftsApi } from '@/lib/api/drafts';
import { qk } from '@/lib/api/queryKeys';
import { draftToContent } from '@/lib/api/adapters';
import { routes } from '@/lib/routes';

export default function DashboardPage() {
  const query = useQuery({
    queryKey: qk.drafts(),
    queryFn: () => draftsApi.list(),
  });

  const drafts = query.data ?? [];
  const recent = drafts.slice(0, 5).map(draftToContent);

  return (
    <>
      <PageHeader
        title={
          <>
            안녕, 민지 <span className="ml-1">👋</span>
          </>
        }
        subtitle="이번 주, 콘텐츠 3개 발행됨 · 발행 큐에 2개 대기 중"
        actions={
          <>
            <Button variant="ghost" onClick={() => query.refetch()}>
              <RefreshCw className="w-3.5 h-3.5" /> 새로고침
            </Button>
            <Link
              href={routes.newContent}
              className="inline-flex items-center gap-1.5 bg-text text-white rounded-md px-3.5 py-2 text-[12.5px] font-semibold hover:bg-black"
            >
              <Plus className="w-3.5 h-3.5" /> 새 콘텐츠
            </Link>
          </>
        }
      />

      <div className="px-7 py-6 flex flex-col gap-5">
        {/* 4 stats — 발행 phase 까지 mock 유지 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="이번 달 콘텐츠" value="3" trend="+2 지난 주" />
          <Stat label="총 조회수" value="4,319" trend="+1,284 7일" />
          <Stat label="발행 성공률" value="92%" trend="11/12" />
          <Stat label="평균 양산 시간" value="47s" trend="목표 60s" trendKind="success" />
        </div>

        {/* 2-col layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
          {/* Left: 최근 작업 (실데이터) */}
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
                <button
                  onClick={() => query.refetch()}
                  className="text-accent hover:underline"
                >
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

          {/* Right: 발행 예정 + 채널 성과 — 발행 phase 까지 mock */}
          <div className="flex flex-col gap-5 min-w-0">
            <Panel title="발행 예정" sub="0개">
              <div className="px-3.5 py-6 text-[12px] text-text-3 text-center">
                예약된 발행이 없어요
              </div>
            </Panel>

            <Panel title="이번 주 채널 성과">
              <div className="flex flex-col">
                <ChannelStat
                  channel="naver"
                  name="네이버 블로그"
                  metric="조회 2,517 · 댓글 24"
                  trend="+18%"
                />
                <ChannelStat
                  channel="insta"
                  name="인스타그램"
                  metric="좋아요 412 · 저장 38"
                  trend="+9%"
                />
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}
