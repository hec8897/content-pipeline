import { PageHeader } from '@/components/layout/PageHeader';
import { DashboardActions } from '@/features/home/components/DashboardActions';
import { DashboardStats } from '@/features/home/components/DashboardStats';
import { RecentWorkPanel } from '@/features/home/components/RecentWorkPanel';
import { ScheduledPanel } from '@/features/home/components/ScheduledPanel';
import { ChannelPerformancePanel } from '@/features/home/components/ChannelPerformancePanel';

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title={
          <>
            안녕, 민지 <span className="ml-1">👋</span>
          </>
        }
        subtitle="이번 주, 콘텐츠 3개 발행됨 · 발행 큐에 2개 대기 중"
        actions={<DashboardActions />}
      />

      <div className="px-7 py-6 flex flex-col gap-5">
        <DashboardStats />

        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
          <RecentWorkPanel />
          <div className="flex flex-col gap-5 min-w-0">
            <ScheduledPanel />
            <ChannelPerformancePanel />
          </div>
        </div>
      </div>
    </>
  );
}
