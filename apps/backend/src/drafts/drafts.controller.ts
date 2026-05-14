import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '@supabase/supabase-js';

import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';

import { PatchDraftDto } from './dto/patch-draft.dto';
import { DraftsService } from './drafts.service';

type AuthedRequest = Request & { user: User };

@Controller('drafts')
@UseGuards(SupabaseAuthGuard)
export class DraftsController {
  constructor(private readonly drafts: DraftsService) {}

  @Get()
  list(@Req() req: AuthedRequest) {
    return this.drafts.listForUser(req.user.id);
  }

  @Patch(':id')
  patch(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchDraftDto,
  ) {
    return this.drafts.patch(id, req.user.id, dto);
  }
}
