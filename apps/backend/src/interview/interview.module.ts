import { Module } from '@nestjs/common';

import { LlmModule } from '@/llm/llm.module';

import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';

@Module({
  imports: [LlmModule],
  controllers: [InterviewController],
  providers: [InterviewService],
  exports: [InterviewService],
})
export class InterviewModule {}
