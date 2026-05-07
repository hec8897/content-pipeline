import Link from "next/link";
import { Eye, Heart } from "lucide-react";
import type { Content } from "@/lib/types";
import { StatusPill } from "@/components/ui/StatusPill";
import { ChannelIcon } from "@/components/ui/ChannelIcon";
import { routes } from "@/lib/routes";
import { formatNumber } from "@/lib/format";

export function LibraryCard({ content }: { content: Content }) {
  return (
    <Link
      href={routes.libraryItem(content.id)}
      className="group flex flex-col bg-surface border border-border rounded-[10px] overflow-hidden hover:border-border-strong transition-colors"
    >
      <div
        className="relative aspect-video flex items-center justify-center"
        style={{ background: content.thumb, color: content.thumbFg }}
      >
        <div className="absolute top-2 left-2">
          <StatusPill kind={content.state} />
        </div>
        <div className="absolute top-2 right-2 flex gap-1">
          {content.channels.map((ch) => (
            <ChannelIcon key={ch} channel={ch} size={20} />
          ))}
        </div>
        <div className="text-[22px] font-bold whitespace-pre-line text-center leading-tight px-4">
          {content.thumbText}
        </div>
      </div>

      <div className="p-3 flex flex-col gap-1">
        <h3
          className="text-[13px] font-semibold text-text"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {content.title}
        </h3>
        <div className="flex items-center gap-1.5 text-[11px] text-text-3">
          <span className="truncate">{content.topic}</span>
          <span>·</span>
          <span className="font-mono shrink-0">{content.publishedAt}</span>
        </div>

        {content.state === "live" && (
          <div className="mt-2 pt-2 border-t border-border flex items-center gap-3 text-[11px] text-text-2">
            <span className="inline-flex items-center gap-1">
              <Eye className="w-3 h-3" /> {formatNumber(content.views)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="w-3 h-3" /> {formatNumber(content.likes)}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
