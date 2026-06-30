import type { ContentState } from '@/types';
import { StatusPill } from '@/components/ui/StatusPill';
import type { PublishStatus } from '@/lib/api/types';

// 발행 큐 상태 → StatusPill(ContentState) 매핑. published 는 pill 의 'live'(성공 톤) 재사용.
const MAP: Record<PublishStatus, { kind: ContentState; label: string }> = {
  pending: { kind: 'pending', label: '대기' },
  processing: { kind: 'processing', label: '진행 중' },
  published: { kind: 'live', label: '발행 완료' },
  failed: { kind: 'failed', label: '실패' },
};

export function JobStatusBadge({ status }: { status: PublishStatus }) {
  const { kind, label } = MAP[status];
  return <StatusPill kind={kind} label={label} />;
}
