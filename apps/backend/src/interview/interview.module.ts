import { Module } from '@nestjs/common';

import { GeminiModule } from '@/gemini/gemini.module';

import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';

@Module({
  imports: [GeminiModule],
  controllers: [InterviewController],
  providers: [InterviewService],
  exports: [InterviewService],
})
export class InterviewModule {}
