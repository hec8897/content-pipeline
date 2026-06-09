import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { PublishController } from './publish.controller';
import { PublishService } from './publish.service';

// Phase 8-1 발행 큐. C2 = 큐 서비스 + REST API. C3 워커/트리거, C4 콜백.
// SupabaseModule 은 @Global 이라 재import 불필요.
@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [PublishController],
  providers: [PublishService],
})
export class PublishModule {}
