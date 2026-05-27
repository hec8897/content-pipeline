export type ContentState = 'draft' | 'processing' | 'scheduled' | 'live' | 'failed' | 'pending';

export type Channel = 'naver' | 'insta';

export type Content = {
  id: string;
  title: string;
  topic: string;
  thumb: string;
  thumbFg: string;
  thumbText: string;
  state: ContentState;
  channels: Channel[];
  publishedAt: string;
  views: number;
  likes: number;
};

export type QueueItem = {
  id: string;
  contentTitle: string;
  channel: Channel;
  state: 'processing' | 'pending' | 'scheduled' | 'failed';
  startedAt: string;
  note: string;
  attempt: number;
};

export type CardNewsCard = {
  id: string;
  type: 'cover' | 'body' | 'outro';
  title: string;
  subtitle?: string;
  body?: string;
  num?: string;
  tag?: string;
  cta?: string;
  bg: string;
  fg: string;
  // Phase 7.5 — 카드 배경 이미지 Storage public URL (AI 재생성/업로드 결과).
  // PATCH 로 card_news[idx].bg_image 에 영속화된다.
  bg_image?: string;
};

export type InterviewQA = {
  q: string;
  a: string;
  placeholder?: string;
};

export type ActivityEvent = {
  ts: string;
  tag: 'naver' | 'insta' | 'n8n' | 'api' | 'db' | 'ai';
  note: string;
  state: 'ok' | 'fail';
};
