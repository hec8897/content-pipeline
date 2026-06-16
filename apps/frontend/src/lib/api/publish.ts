import type { Channel } from '@/types';
import { api } from './client';
import type { PublishJob } from './types';

// 채널 값 매핑 — 프론트 도메인('insta') ↔ 백엔드 발행 API('instagram').
// 매핑은 이 모듈(API 경계)에만 가둔다. 나머지 프론트 코드는 Channel 타입 그대로 사용.
type ApiChannel = 'naver' | 'instagram';

function toApiChannel(ch: Channel): ApiChannel {
  return ch === 'insta' ? 'instagram' : 'naver';
}

function fromApiChannel(ch: string): Channel {
  return ch === 'instagram' ? 'insta' : 'naver';
}

// API 가 돌려준 row 의 channel 을 프론트 Channel 로 정규화.
function normalizeJob(raw: PublishJob & { channel: string }): PublishJob {
  return { ...raw, channel: fromApiChannel(raw.channel) };
}

export const publishApi = {
  // POST /drafts/:id/publish — 채널별 1 job(pending) 생성. 즉시발행이라 scheduledAt 미전송.
  async create(draftId: string, channels: Channel[]): Promise<PublishJob[]> {
    const res = await api.post<(PublishJob & { channel: string })[]>(
      `/drafts/${draftId}/publish`,
      { channels: channels.map(toApiChannel) },
    );
    return res.data.map(normalizeJob);
  },

  // GET /drafts/:id/jobs — draft 의 job 목록(최신순).
  async listJobs(draftId: string): Promise<PublishJob[]> {
    const res = await api.get<(PublishJob & { channel: string })[]>(`/drafts/${draftId}/jobs`);
    return res.data.map(normalizeJob);
  },

  // POST /publish-jobs/:id/retry — failed job 수동 재시도.
  async retry(jobId: string): Promise<PublishJob> {
    const res = await api.post<PublishJob & { channel: string }>(
      `/publish-jobs/${jobId}/retry`,
    );
    return normalizeJob(res.data);
  },
};
