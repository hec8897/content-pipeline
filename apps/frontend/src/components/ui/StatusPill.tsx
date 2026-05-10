import type { ContentState } from '@/types';
import { STATE_LABEL } from '@/mocks';

type Kind = ContentState;

type Props = {
  kind: Kind;
  label?: string;
};

const map: Record<Kind, { bg: string; text: string; dot: string }> = {
  live: {
    bg: 'bg-[rgba(47,148,97,0.1)]',
    text: 'text-success',
    dot: 'bg-success',
  },
  scheduled: {
    bg: 'bg-[rgba(200,127,10,0.1)]',
    text: 'text-warn',
    dot: 'bg-warn',
  },
  pending: {
    bg: 'bg-[rgba(200,127,10,0.1)]',
    text: 'text-warn',
    dot: 'bg-warn',
  },
  processing: {
    bg: 'bg-accent-soft',
    text: 'text-accent',
    dot: 'bg-accent',
  },
  failed: {
    bg: 'bg-[rgba(215,58,58,0.1)]',
    text: 'text-danger',
    dot: 'bg-danger',
  },
  draft: {
    bg: 'bg-surface-2',
    text: 'text-text-2',
    dot: 'bg-text-3',
  },
};

export function StatusPill({ kind, label }: Props) {
  const c = map[kind];
  const text = label ?? STATE_LABEL[kind] ?? kind;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-[2px] rounded-full text-[11px] font-semibold ${c.bg} ${c.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {text}
    </span>
  );
}
