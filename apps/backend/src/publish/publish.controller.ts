import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '@supabase/supabase-js';

import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';

import { CreatePublishDto } from './dto/create-publish.dto';
import { PublishService } from './publish.service';

type AuthedRequest = Request & { user: User };

// 경로가 drafts/* 와 publish-jobs/* 로 갈려 prefix 없이 메서드별 전체 경로 사용.
@Controller()
@UseGuards(SupabaseAuthGuard)
export class PublishController {
  constructor(private readonly publish: PublishService) {}

  @Post('drafts/:id/publish')
  create(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePublishDto,
  ) {
    return this.publish.createJobs(id, req.user.id, dto);
  }

  @Get('drafts/:id/jobs')
  list(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.publish.listJobs(id, req.user.id);
  }

  @Post('publish-jobs/:id/retry')
  retry(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.publish.retry(id, req.user.id);
  }
}
