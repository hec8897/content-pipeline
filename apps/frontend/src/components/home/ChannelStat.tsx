import { ChannelIcon } from "@/components/ui/ChannelIcon";
import type { Channel } from "@/lib/types";

type Props = {
  channel: Channel;
  name: string;
  metric: string;
  trend: string;
};

export function ChannelStat({ channel, name, metric, trend }: Props) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3 border-t border-border first:border-t-0">
      <ChannelIcon channel={channel} size={28} />
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-medium text-text">{name}</div>
        <div className="text-[11px] text-text-3">{metric}</div>
      </div>
      <span className="text-[11.5px] font-semibold text-success">{trend}</span>
    </div>
  );
}
