import { PageHeader } from '@/components/layout/PageHeader';
import { QueueActions } from '@/features/queue/components/QueueActions';
import { QueueStatsGrid } from '@/features/queue/components/QueueStatsGrid';
import { EnginePanel } from '@/features/queue/components/EnginePanel';
import { QueueGroups } from '@/features/queue/components/QueueGroups';

export default function QueuePage() {
  return (
    <>
      <PageHeader
        title="발행 큐"
        subtitle="자동 새로고침 · 5초 간격 · n8n@dev 연결됨"
        actions={<QueueActions />}
      />

      <div className="px-7 py-6 flex flex-col gap-5">
        <QueueStatsGrid />
        <EnginePanel />
        <QueueGroups />
      </div>
    </>
  );
}
