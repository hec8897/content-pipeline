import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '@supabase/supabase-js';

import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';

import { AnswerDto } from './dto/answer.dto';
import { PatchMessageDto } from './dto/patch-message.dto';
import { InterviewService } from './interview.service';

type AuthedRequest = Request & { user: User };

@Controller('interview')
@UseGuards(SupabaseAuthGuard)
export class InterviewController {
  constructor(private readonly interview: InterviewService) {}

  @Post(':sessionId/answer')
  answer(
    @Req() req: AuthedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: AnswerDto,
  ) {
    return this.interview.answer(sessionId, req.user.id, dto.content);
  }

  @Post(':sessionId/stop')
  stop(@Req() req: AuthedRequest, @Param('sessionId', ParseUUIDPipe) sessionId: string) {
    return this.interview.stop(sessionId, req.user.id);
  }

  @Patch(':sessionId/messages/:messageId')
  patchMessage(
    @Req() req: AuthedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: PatchMessageDto,
  ) {
    return this.interview.patchUserMessage(sessionId, messageId, req.user.id, dto.content);
  }

  @Put(':sessionId/questions/:questionId/answer')
  upsertAnswer(
    @Req() req: AuthedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: PatchMessageDto,
  ) {
    return this.interview.upsertAnswer(sessionId, questionId, req.user.id, dto.content);
  }
}
