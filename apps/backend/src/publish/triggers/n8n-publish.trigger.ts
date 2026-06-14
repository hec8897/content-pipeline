import { createHmac } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Database } from '@/supabase/database.types';

import { triggerPayloadSchema } from '../publish.schema';
import type { PublishTrigger } from './publish-trigger';

type PublishJobRow = Database['public']['Tables']['publish_jobs']['Row'];

// 앱 → n8n 트리거. body 를 HMAC-SHA256 서명해 x-cp-signature 헤더로 전송.
// 설정은 lazy 로 읽어 n8n 미구성 로컬에서도 부팅이 깨지지 않게 함(트리거 시점에만 throw).
@Injectable()
export class N8nPublishTrigger implements PublishTrigger {
  constructor(private readonly config: ConfigService) {}

  async trigger(job: PublishJobRow): Promise<void> {
    const webhookUrl = this.config.get<string>('N8N_WEBHOOK_URL');
    const secret = this.config.get<string>('HMAC_WEBHOOK_SECRET');
    if (!webhookUrl || !secret) {
      throw new Error('N8N_WEBHOOK_URL / HMAC_WEBHOOK_SECRET not configured');
    }

    // channel 은 DB 상 string → zod 가 'naver'|'instagram' 으로 narrowing. payload 는 8-1 stub 이라 빈 객체.
    const payload = triggerPayloadSchema.parse({
      jobId: job.id,
      draftId: job.draft_id,
      channel: job.channel,
      payload: {},
    });

    const body = JSON.stringify(payload);
    const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-cp-signature': signature },
      body,
    });
    if (!res.ok) {
      throw new Error(`n8n webhook responded ${res.status}`);
    }
  }
}
