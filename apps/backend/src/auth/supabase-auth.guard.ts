import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

import { SupabaseService } from '@/supabase/supabase.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authorization token is required');
    }

    const { data, error } = await this.supabase.anon.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    (request as Request & { user: typeof data.user }).user = data.user;
    return true;
  }

  private extractToken(request: Request): string | null {
    // 1. Authorization: Bearer <token> 헤더 (일반 API 요청)
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

    // 2. ?token= 쿼리 파라미터 (EventSource 는 커스텀 헤더 미지원)
    const queryToken = (request.query as Record<string, string | undefined>).token;
    if (queryToken) return queryToken;

    return null;
  }
}
