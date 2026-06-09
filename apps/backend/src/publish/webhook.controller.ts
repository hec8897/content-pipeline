import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';

import { publishResultSchema } from './publish.schema';
import { PublishService } from './publish.service';
import { WebhookHmacGuard } from './webhook-hmac.guard';

// n8n 콜백 수신. 인증 가드 없음(public) — WebhookHmacGuard 의 HMAC 서명이 신원 보증.
@Controller('webhook')
export class WebhookController {
  constructor(private readonly publish: PublishService) {}

  @Post('publish-result')
  @HttpCode(200)
  @UseGuards(WebhookHmacGuard)
  async publishResult(@Body() body: unknown): Promise<{ ok: true }> {
    const { jobId, status, externalRef, error } = publishResultSchema.parse(body);
    await this.publish.markResult(jobId, status, externalRef, error);
    return { ok: true };
  }
}
