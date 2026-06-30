import { z } from 'zod';

// 발행 채널. Phase 9(naver)/10(instagram) 에서 실제 발행 노드 연결. 8-1 stub 은 채널 무관 echo.
export const publishChannelSchema = z.enum(['naver', 'instagram']);
export type PublishChannel = z.infer<typeof publishChannelSchema>;

// 큐 상태머신. pending → processing → published / failed.
export const publishStatusSchema = z.enum(['pending', 'processing', 'published', 'failed']);
export type PublishStatus = z.infer<typeof publishStatusSchema>;

// 인스타 캐러셀 payload. caption + 카드 이미지 공개 URL 2~10장.
export const instagramPayloadSchema = z.object({
  caption: z.string().min(1),
  images: z.array(z.string().url()).min(2).max(10),
});
export type InstagramPayload = z.infer<typeof instagramPayloadSchema>;

// POST /drafts/:id/publish 요청 바디. channels 채널별 1 job. scheduledAt 미래면 예약 발행.
export const createPublishSchema = z.object({
  channels: z.array(publishChannelSchema).min(1).max(2),
  // offset:true — 한국 로컬(+09:00) 등 타임존 오프셋 허용. 기본값은 Z(UTC)만 받아 예약 발행이 깨짐.
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  // 인스타 캐러셀 이미지 URL 2~10장. 채널이 instagram 일 때 필수 — service 에서 검증.
  images: z.array(z.string().url()).min(2).max(10).optional(),
});
export type CreatePublishPayload = z.infer<typeof createPublishSchema>;

// 앱 → n8n 트리거 webhook 바디. payload 는 채널별 발행 데이터(인스타 = {caption, images}).
// payload 형태 검증은 service(instagramPayloadSchema)에서, 여기선 통과만.
export const triggerPayloadSchema = z.object({
  jobId: z.string().uuid(),
  draftId: z.string().uuid(),
  channel: publishChannelSchema,
  payload: z.record(z.string(), z.unknown()),
});
export type TriggerPayload = z.infer<typeof triggerPayloadSchema>;

// n8n → 앱 콜백 webhook 바디 (POST /api/webhook/publish-result).
export const publishResultSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum(['published', 'failed']),
  externalRef: z.string().optional(),
  error: z.string().optional(),
});
export type PublishResultPayload = z.infer<typeof publishResultSchema>;
