import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import type { Database } from '@/supabase/database.types';
import { SupabaseService } from '@/supabase/supabase.service';
import { StorageService } from '@/storage/storage.service';

import {
  createPublishSchema,
  instagramPayloadSchema,
  type PublishChannel,
  type PublishStatus,
} from './publish.schema';

type PublishJobRow = Database['public']['Tables']['publish_jobs']['Row'];
type DraftRow = Database['public']['Tables']['drafts']['Row'];

// 자동 재시도 backoff: scheduled_at = now + attempts * BACKOFF. 단순 선형.
const RETRY_BACKOFF_MS = 60_000;
// 워커가 한 폴링에서 집는 최대 job 수.
const CLAIM_BATCH = 20;

@Injectable()
export class PublishService {
  private readonly logger = new Logger(PublishService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly storage: StorageService,
  ) {}

  // POST /drafts/:id/publish — 채널별 1 job(pending) 생성. scheduledAt 미래면 예약 발행.
  async createJobs(draftId: string, userId: string, input: unknown): Promise<PublishJobRow[]> {
    const { channels, scheduledAt, images } = createPublishSchema.parse(input);
    const draft = await this.loadOwnedDraft(draftId, userId);

    // 채널 배열 내 중복 제거(예: ['naver','naver']). 활성 job 중복은 DB 유니크 인덱스가 최종 방어.
    const uniqueChannels = [...new Set(channels)];

    // 인스타 채널 포함 시 caption + images 사전 검증. 공개 URL base 접두사 검사.
    const storageBase = this.storage.getPublicUrl('');
    const rows = uniqueChannels.map((channel: PublishChannel) => {
      if (channel === 'instagram') {
        if (!draft.caption || !draft.caption.trim()) {
          throw new BadRequestException('인스타 발행에는 캡션이 필요합니다');
        }
        if (!images || images.length < 2 || images.length > 10) {
          throw new BadRequestException('인스타 발행에는 이미지 2~10장이 필요합니다');
        }
        for (const url of images) {
          if (!url.startsWith(storageBase)) {
            throw new BadRequestException('허용되지 않은 이미지 URL 입니다');
          }
        }
        const payload = instagramPayloadSchema.parse({ caption: draft.caption, images });
        return {
          draft_id: draftId,
          user_id: userId,
          channel,
          status: 'pending' as const,
          payload,
          ...(scheduledAt ? { scheduled_at: scheduledAt } : {}),
        };
      }
      // naver 등 기타 채널 — payload 미설정(추후).
      return {
        draft_id: draftId,
        user_id: userId,
        channel,
        status: 'pending' as const,
        ...(scheduledAt ? { scheduled_at: scheduledAt } : {}),
      };
    });

    const { data, error } = await this.supabase.admin.from('publish_jobs').insert(rows).select();
    if (error) {
      // 23505 = unique_violation: 이미 발행 대기/진행 중인 채널 → 중복 발행 차단.
      if (error.code === '23505') {
        throw new ConflictException('이미 발행 대기 또는 진행 중인 채널이 있습니다');
      }
      throw new BadRequestException(`Failed to create publish jobs: ${error.message}`);
    }
    return data ?? [];
  }

  // GET /drafts/:id/jobs — 해당 draft 의 job 목록(소유 검증).
  async listJobs(draftId: string, userId: string): Promise<PublishJobRow[]> {
    await this.loadOwnedDraft(draftId, userId);
    const { data, error } = await this.supabase.admin
      .from('publish_jobs')
      .select('*')
      .eq('draft_id', draftId)
      .order('created_at', { ascending: false });
    if (error) throw new BadRequestException(`Failed to list publish jobs: ${error.message}`);
    return data ?? [];
  }

  // 워커(C3) 가 호출. pending AND scheduled_at<=now() 을 집어 processing 으로 선점.
  // 조건부 UPDATE(status='pending') 로 중복 픽업 방어 — 선점 성공한 row 만 반환.
  async claimDueJobs(): Promise<PublishJobRow[]> {
    const { data: due, error } = await this.supabase.admin
      .from('publish_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(CLAIM_BATCH);
    if (error) throw new BadRequestException(`Failed to poll publish jobs: ${error.message}`);

    const claimed: PublishJobRow[] = [];
    for (const job of due ?? []) {
      const { data: updated, error: claimErr } = await this.supabase.admin
        .from('publish_jobs')
        .update({
          status: 'processing',
          attempts: job.attempts + 1,
          triggered_at: new Date().toISOString(),
        })
        .eq('id', job.id)
        .eq('status', 'pending')
        .select()
        .maybeSingle();
      if (claimErr) {
        this.logger.error(`claim failed for job ${job.id}: ${claimErr.message}`);
        continue;
      }
      if (updated) claimed.push(updated);
    }
    return claimed;
  }

  // 콜백(C4) / 트리거 실패(C3) 가 호출. 멱등 + 자동 재시도 분기.
  async markResult(
    jobId: string,
    status: Extract<PublishStatus, 'published' | 'failed'>,
    externalRef?: string,
    error?: string,
  ): Promise<void> {
    const { data: job, error: loadErr } = await this.supabase.admin
      .from('publish_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();
    if (loadErr) throw new BadRequestException(`Failed to load publish job: ${loadErr.message}`);
    if (!job) {
      this.logger.warn(`markResult: job ${jobId} not found (no-op)`);
      return;
    }
    // 멱등: 이미 종결(published) 또는 max 도달 failed 면 무시(중복 콜백 방어).
    if (job.status === 'published') return;
    if (job.status === 'failed' && job.attempts >= job.max_attempts) return;

    if (status === 'published') {
      await this.update(jobId, {
        status: 'published',
        published_at: new Date().toISOString(),
        external_ref: externalRef ?? null,
        last_error: null,
      });
      return;
    }

    // status === 'failed'
    if (job.attempts < job.max_attempts) {
      // 자동 재시도: backoff 후 pending 재큐.
      const nextAt = new Date(Date.now() + job.attempts * RETRY_BACKOFF_MS).toISOString();
      await this.update(jobId, {
        status: 'pending',
        scheduled_at: nextAt,
        last_error: error ?? null,
      });
    } else {
      await this.update(jobId, { status: 'failed', last_error: error ?? null });
    }
  }

  // POST /publish-jobs/:id/retry — 수동 재시도(failed 만). attempts 리셋 후 즉시 pending.
  async retry(jobId: string, userId: string): Promise<PublishJobRow> {
    const job = await this.loadOwnedJob(jobId, userId);
    if (job.status !== 'failed') {
      throw new BadRequestException('Only failed jobs can be retried');
    }
    const { data, error } = await this.supabase.admin
      .from('publish_jobs')
      .update({
        status: 'pending',
        attempts: 0,
        scheduled_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', jobId)
      .select()
      .single();
    if (error) {
      // failed job 재활성 시 같은 채널의 다른 활성 job 과 충돌(유니크 인덱스) → 23505.
      if (error.code === '23505') {
        throw new ConflictException('이미 발행 대기 또는 진행 중인 같은 채널 작업이 있습니다');
      }
      throw new BadRequestException(`Failed to retry publish job: ${error.message}`);
    }
    return data;
  }

  private async update(
    jobId: string,
    patch: Database['public']['Tables']['publish_jobs']['Update'],
  ): Promise<void> {
    const { error } = await this.supabase.admin.from('publish_jobs').update(patch).eq('id', jobId);
    if (error) throw new BadRequestException(`Failed to update publish job: ${error.message}`);
  }

  private async loadOwnedDraft(draftId: string, userId: string): Promise<DraftRow> {
    const { data, error } = await this.supabase.admin
      .from('drafts')
      .select('*')
      .eq('id', draftId)
      .maybeSingle();
    if (error) throw new BadRequestException(`Failed to load draft: ${error.message}`);
    if (!data) throw new NotFoundException('Draft not found');
    if (data.user_id !== userId) throw new ForbiddenException('Draft does not belong to user');
    return data;
  }

  private async loadOwnedJob(jobId: string, userId: string): Promise<PublishJobRow> {
    const { data, error } = await this.supabase.admin
      .from('publish_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();
    if (error) throw new BadRequestException(`Failed to load publish job: ${error.message}`);
    if (!data) throw new NotFoundException('Publish job not found');
    if (data.user_id !== userId)
      throw new ForbiddenException('Publish job does not belong to user');
    return data;
  }
}
