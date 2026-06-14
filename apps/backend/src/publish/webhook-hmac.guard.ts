import { createHmac, timingSafeEqual } from 'node:crypto';

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  type RawBodyRequest,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

// n8n → 앱 콜백의 x-cp-signature 를 HMAC-SHA256(rawBody, HMAC_WEBHOOK_SECRET) 로 검증.
// 인증 가드(SupabaseAuthGuard) 대신 이 서명이 콜백의 신원·무결성 보증.
@Injectable()
export class WebhookHmacGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    const secret = this.config.get<string>('HMAC_WEBHOOK_SECRET');
    if (!secret) throw new UnauthorizedException('webhook secret not configured');

    const provided = req.headers['x-cp-signature'];
    const raw = req.rawBody;
    if (typeof provided !== 'string' || !raw) {
      throw new UnauthorizedException('missing signature or body');
    }

    const expected = `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`;
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    // 길이 다르면 timingSafeEqual 이 throw → 먼저 길이 체크.
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('invalid signature');
    }
    return true;
  }
}
