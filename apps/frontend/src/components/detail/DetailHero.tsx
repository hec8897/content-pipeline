import type { Content } from "@/lib/types";
import { StatusPill } from "@/components/ui/StatusPill";
import { ChannelIcon } from "@/components/ui/ChannelIcon";
import { formatNumber } from "@/lib/format";

type Props = {
  content: Content;
};

const metrics = (c: Content) => [
  { label: "조회", value: formatNumber(c.views) },
  { label: "좋아요", value: formatNumber(c.likes) },
  { label: "공유", value: "12" },
  { label: "댓글", value: "8" },
];

export function DetailHero({ content }: Props) {
  return (
    <div className="bg-surface border-b border-border px-7 py-5">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div
          className="w-[72px] h-[72px] rounded shrink-0 flex items-center justify-center text-[12px] font-bold whitespace-pre-line text-center leading-tight"
          style={{ background: content.thumb, color: content.thumbFg }}
        >
          {content.thumbText}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <StatusPill kind={content.state} />
            {content.channels.map((ch) => (
              <ChannelIcon key={ch} channel={ch} size={18} />
            ))}
            <span className="text-[11px] font-mono text-text-3">
              {content.id}
            </span>
          </div>
          <div className="text-[12.5px] text-text-2">
            {content.topic} · {content.publishedAt}
          </div>
        </div>
        {content.state === "live" && (
          <div className="grid grid-cols-4 gap-4 md:gap-6 shrink-0">
            {metrics(content).map((m) => (
              <div key={m.label} className="flex flex-col items-end">
                <span className="text-[16px] font-semibold text-text">
                  {m.value}
                </span>
                <span className="text-[10.5px] text-text-3 uppercase tracking-wide">
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
