import { Module } from '@nestjs/common';

import { DraftsModule } from '@/drafts/drafts.module';
import { InterviewModule } from '@/interview/interview.module';

import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';

@Module({
  imports: [InterviewModule, DraftsModule],
  controllers: [TopicsController],
  providers: [TopicsService],
})
export class TopicsModule {}
