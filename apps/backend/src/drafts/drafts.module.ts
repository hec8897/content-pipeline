import { Module } from '@nestjs/common';

import { GeminiModule } from '@/gemini/gemini.module';

import { DraftsController } from './drafts.controller';
import { DraftsService } from './drafts.service';

@Module({
  imports: [GeminiModule],
  controllers: [DraftsController],
  providers: [DraftsService],
  exports: [DraftsService],
})
export class DraftsModule {}
