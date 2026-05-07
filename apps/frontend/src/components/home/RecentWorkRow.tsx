import Link from "next/link";
import type { Content } from "@/lib/types";
import { StatusPill } from "@/components/ui/StatusPill";
import { routes } from "@/lib/routes";

export function RecentWorkRow({ content }: { content: Content }) {
  return (
    <Link
      href={routes.libraryItem(content.id)}
      className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-surface-2 transition-colors"
    >
      <div
        className="w-[42px] h-[42px] rounded shrink-0 flex items-center justify-center text-[10px] font-bold whitespace-pre-line text-center leading-tight"
        style={{ background: content.thumb, color: content.thumbFg }}
      >
        {content.thumbText}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-medium text-text truncate">
          {content.title}
        </div>
        <div className="text-[11px] text-text-3 truncate">
          {content.topic} · {content.publishedAt}
        </div>
      </div>
      <StatusPill kind={content.state} />
    </Link>
  );
}
