import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Content } from '@/lib/types';
import { StatusPill } from '@/components/ui/StatusPill';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { routes } from '@/lib/routes';
import { formatNumber } from '@/lib/format';

export function LibraryRow({ content }: { content: Content }) {
  return (
    <Link
      href={routes.libraryItem(content.id)}
      className="grid grid-cols-[1fr_120px_100px_100px_80px_32px] items-center gap-3 px-3.5 py-2.5 border-t border-border first:border-t-0 hover:bg-surface-2 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-[8px] font-bold whitespace-pre-line text-center leading-tight"
          style={{ background: content.thumb, color: content.thumbFg }}
        >
          {content.thumbText}
        </div>
        <div className="min-w-0">
          <div className="text-[12.5px] font-medium text-text truncate">{content.title}</div>
          <div className="text-[11px] text-text-3 truncate">{content.topic}</div>
        </div>
      </div>
      <div>
        <StatusPill kind={content.state} />
      </div>
      <div className="flex items-center gap-1">
        {content.channels.map((ch) => (
          <ChannelIcon key={ch} channel={ch} size={18} />
        ))}
      </div>
      <div className="text-[11px] font-mono text-text-2">{content.publishedAt}</div>
      <div className="text-[11.5px] text-text-2 text-right">
        {content.state === 'live' ? formatNumber(content.views) : '—'}
      </div>
      <ChevronRight className="w-4 h-4 text-text-3" />
    </Link>
  );
}
