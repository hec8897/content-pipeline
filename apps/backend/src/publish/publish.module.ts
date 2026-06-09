import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { PublishController } from './publish.controller';
import { PublishService } from './publish.service';
import { PublishWorker } from './publish.worker';
import { N8nPublishTrigger } from './triggers/n8n-publish.trigger';
import { PUBLISH_TRIGGER } from './triggers/publish-trigger';

// Phase 8-1 발행 큐. C3 = 워커 + n8n HMAC 트리거 어댑터. C4 콜백.
// SupabaseModule 은 @Global 이라 재import 불필요.
@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [PublishController],
  providers: [
    PublishService,
    PublishWorker,
    { provide: PUBLISH_TRIGGER, useClass: N8nPublishTrigger },
  ],
})
export class PublishModule {}
