import { QueueStat } from '@/features/queue/components/QueueStat';
import { QUEUE_GROUPS } from '@/features/queue/queue-groups';
import { QUEUE_ITEMS } from '@/mocks';

export function QueueStatsGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {QUEUE_GROUPS.map((g) => (
        <QueueStat
          key={g.key}
          label={g.label}
          state={g.key}
          count={QUEUE_ITEMS.filter((q) => q.state === g.key).length}
        />
      ))}
    </div>
  );
}
