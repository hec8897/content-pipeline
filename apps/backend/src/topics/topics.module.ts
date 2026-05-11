import { Module } from '@nestjs/common';

import { InterviewModule } from '@/interview/interview.module';

import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';

@Module({
  imports: [InterviewModule],
  controllers: [TopicsController],
  providers: [TopicsService],
})
export class TopicsModule {}
