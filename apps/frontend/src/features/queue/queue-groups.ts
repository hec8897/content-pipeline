import type { QueueItem } from '@/types';

export type QueueGroup = { key: QueueItem['state']; label: string };

export const QUEUE_GROUPS: QueueGroup[] = [
  { key: 'processing', label: '진행 중' },
  { key: 'pending', label: '대기' },
  { key: 'scheduled', label: '예약됨' },
  { key: 'failed', label: '실패' },
];
