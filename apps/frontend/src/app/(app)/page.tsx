import Link from 'next/link';
import { Plus, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Stat } from '@/components/ui/Stat';
import { Panel } from '@/components/ui/Panel';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { Button } from '@/components/ui/Button';
import { RecentWorkRow } from '@/features/home/components/RecentWorkRow';
import { ChannelStat } from '@/features/home/components/ChannelStat';
import { LIBRARY_ITEMS } from '@/mocks';
import { routes } from '@/lib/routes';

export default function DashboardPage() {
  const scheduled = LIBRARY_ITEMS.filter((i) => i.state === 'scheduled');

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
            <Button variant="ghost">
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
        {/* 4 stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="이번 달 콘텐츠" value="3" trend="+2 지난 주" />
          <Stat label="총 조회수" value="4,319" trend="+1,284 7일" />
          <Stat label="발행 성공률" value="92%" trend="11/12" />
          <Stat label="평균 양산 시간" value="47s" trend="목표 60s" trendKind="success" />
        </div>

        {/* 2-col layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
          {/* Left: 최근 작업 */}
          <Panel
            title="최근 작업"
            sub={`${LIBRARY_ITEMS.length}개`}
            actions={
              <Link href={routes.library} className="text-[11.5px] text-text-2 hover:text-text">
                전체 보기 →
              </Link>
            }
          >
            <div className="flex flex-col divide-y divide-border">
              {LIBRARY_ITEMS.slice(0, 5).map((c) => (
                <RecentWorkRow key={c.id} content={c} />
              ))}
            </div>
          </Panel>

          {/* Right: column with two panels */}
          <div className="flex flex-col gap-5 min-w-0">
            <Panel title="발행 예정" sub={`${scheduled.length}개`}>
              <div className="flex flex-col">
                {scheduled.length === 0 ? (
                  <div className="px-3.5 py-6 text-[12px] text-text-3 text-center">
                    예약된 발행이 없어요
                  </div>
                ) : (
                  scheduled.map((c) => {
                    const [date, time] = c.publishedAt.split(' ');
                    const [, month, day] = date.split('.');
                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 px-3.5 py-2.5 border-t border-border first:border-t-0"
                      >
                        <div className="w-[56px] shrink-0 bg-surface-2 rounded text-center py-1.5">
                          <div className="text-[15px] font-mono font-semibold text-text leading-none">
                            {day}
                          </div>
                          <div className="text-[10px] font-mono text-text-3 mt-0.5">{month}월</div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] font-medium text-text truncate">
                            {c.title}
                          </div>
                          {time && <div className="text-[11px] text-text-3">{time}</div>}
                        </div>
                        <div className="flex items-center gap-1">
                          {c.channels.map((ch) => (
                            <ChannelIcon key={ch} channel={ch} size={20} />
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
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
