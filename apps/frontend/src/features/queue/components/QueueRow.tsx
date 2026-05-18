import { MoreHorizontal, RotateCw } from 'lucide-react';
import type { QueueItem } from '@/types';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { StatusPill } from '@/components/ui/StatusPill';

export function QueueRow({ item }: { item: QueueItem }) {
  return (
    <div className="bg-surface border border-border rounded-lg px-3.5 py-3 flex items-center gap-3">
      <ChannelIcon channel={item.channel} size={28} />
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-medium text-text truncate">{item.contentTitle}</div>
        <div className="text-[11px] text-text-3 truncate font-mono">
          {item.id} · {item.note}
          {item.attempt > 0 && ` · attempt ${item.attempt}/3`}
        </div>
      </div>
      <span className="text-[11px] font-mono text-text-3 hidden sm:inline">{item.startedAt}</span>
      <StatusPill kind={item.state} />
      {item.state === 'failed' && (
        <button className="inline-flex items-center gap-1 px-2 py-1.5 rounded text-[11.5px] text-text-2 border border-border hover:bg-surface-2">
          <RotateCw className="w-3 h-3" /> 재시도
        </button>
      )}
      <button className="text-text-3 hover:text-text">
        <MoreHorizontal className="w-4 h-4" />
      </button>
    </div>
  );
}
