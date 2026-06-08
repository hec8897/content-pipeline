import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import type { User } from '@supabase/supabase-js';

import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';

import { PatchDraftDto } from './dto/patch-draft.dto';
import { DraftsService } from './drafts.service';

type AuthedRequest = Request & { user: User };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB — 버킷 file_size_limit 와 일치

@Controller('drafts')
@UseGuards(SupabaseAuthGuard)
export class DraftsController {
  constructor(private readonly drafts: DraftsService) {}

  @Get()
  list(@Req() req: AuthedRequest) {
    return this.drafts.listForUser(req.user.id);
  }

  @Get(':id/interview')
  getInterview(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.drafts.getInterviewForDraft(id, req.user.id);
  }

  @Patch(':id')
  patch(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchDraftDto,
  ) {
    return this.drafts.patch(id, req.user.id, dto);
  }

  @Post(':id/caption/regenerate')
  regenerateCaption(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.drafts.regenerateCaption(id, req.user.id);
  }

  @Post(':id/cards/:index/regenerate-image')
  regenerateCardImage(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('index', ParseIntPipe) index: number,
  ) {
    if (index < 0 || index > 7) {
      throw new BadRequestException('index must be 0..7');
    }
    return this.drafts.regenerateCardImage(id, req.user.id, index);
  }

  @Post(':id/cards/:index/upload-image')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  uploadCardImage(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('index', ParseIntPipe) index: number,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (index < 0 || index > 7) {
      throw new BadRequestException('index must be 0..7');
    }
    if (!file) {
      throw new BadRequestException('file is required (multipart field "file")');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('이미지는 5MB 이하만 업로드할 수 있어요');
    }
    return this.drafts.uploadCardImage({
      draftId: id,
      userId: req.user.id,
      cardIndex: index,
      body: file.buffer,
      contentType: file.mimetype,
    });
  }
}
