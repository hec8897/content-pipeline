import type { QueueItem } from "@/lib/types";
import { StatusPill } from "@/components/ui/StatusPill";

type Props = {
  label: string;
  count: number;
  state: QueueItem["state"];
};

export function QueueStat({ label, count, state }: Props) {
  return (
    <div className="bg-surface border border-border rounded-[10px] p-3.5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] text-text-3 uppercase tracking-wide">
          {label}
        </span>
        <StatusPill kind={state} label="" />
      </div>
      <span className="text-[24px] font-semibold text-text leading-none">
        {count}
      </span>
    </div>
  );
}
