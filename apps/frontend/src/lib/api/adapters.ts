import type { Content, ContentState } from '@/types';
import type { DraftListItem, DraftStatus } from './types';

export function draftToContent(d: DraftListItem): Content {
  const firstCard = d.card_news?.[0];
  return {
    id: d.id,
    title: d.blog_title ?? d.topic.title,
    topic: d.topic.title,
    thumb: firstCard?.bg ?? '#27272a',
    thumbFg: firstCard?.fg ?? '#ffffff',
    thumbText: firstCard?.num ?? '01',
    state: mapStatus(d.status),
    channels: [],
    publishedAt: formatRelative(d.updated_at),
    views: 0,
    likes: 0,
  };
}

function mapStatus(s: DraftStatus): ContentState {
  switch (s) {
    case 'pending':
    case 'generating':
      return 'processing';
    case 'ready':
      return 'draft';
    case 'failed':
      return 'failed';
  }
}

function formatRelative(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diffMin = Math.floor((now - t) / 60_000);
  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}시간 전`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return '어제';
  if (diffD < 7) return `${diffD}일 전`;
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}
