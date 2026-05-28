import { Module } from '@nestjs/common';

import { LlmModule } from '@/llm/llm.module';
import { StorageModule } from '@/storage/storage.module';

import { DraftsController } from './drafts.controller';
import { DraftsService } from './drafts.service';

@Module({
  imports: [LlmModule, StorageModule],
  controllers: [DraftsController],
  providers: [DraftsService],
  exports: [DraftsService],
})
export class DraftsModule {}
