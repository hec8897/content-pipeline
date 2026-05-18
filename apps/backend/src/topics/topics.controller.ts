import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '@supabase/supabase-js';

import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';
import { DraftsService } from '@/drafts/drafts.service';
import { InterviewService } from '@/interview/interview.service';

import { CreateTopicDto } from './dto/create-topic.dto';
import { TopicsService } from './topics.service';

type AuthedRequest = Request & { user: User };

@Controller('topics')
@UseGuards(SupabaseAuthGuard)
export class TopicsController {
  constructor(
    private readonly topics: TopicsService,
    private readonly interview: InterviewService,
    private readonly drafts: DraftsService,
  ) {}

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateTopicDto) {
    return this.topics.create(req.user.id, dto.title);
  }

  @Get(':id')
  detail(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.topics.getDetail(id, req.user.id);
  }

  @Post(':id/interview/start')
  startInterview(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.interview.start(id, req.user.id);
  }

  @Post(':id/skip-interview')
  skipInterview(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.interview.skipForTopic(id, req.user.id);
  }

  @Post(':id/draft/generate')
  generateDraft(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.drafts.generate(id, req.user.id);
  }

  @Get(':id/draft')
  draft(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.drafts.getForTopic(id, req.user.id);
  }
}
