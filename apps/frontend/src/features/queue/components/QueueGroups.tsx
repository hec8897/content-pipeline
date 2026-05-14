import { QueueRow } from '@/features/queue/components/QueueRow';
import { QUEUE_GROUPS } from '@/features/queue/queue-groups';
import { QUEUE_ITEMS } from '@/mocks';

export function QueueGroups() {
  return (
    <div className="flex flex-col gap-5">
      {QUEUE_GROUPS.map((g) => {
        const items = QUEUE_ITEMS.filter((q) => q.state === g.key);
        if (items.length === 0) return null;
        return (
          <section key={g.key} className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2 px-1">
              <h2 className="text-[12px] font-semibold text-text uppercase tracking-wider">
                {g.label}
              </h2>
              <span className="text-[11px] text-text-3">{items.length}개</span>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((it) => (
                <QueueRow key={it.id} item={it} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
