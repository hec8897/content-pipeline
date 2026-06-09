import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { PublishController } from './publish.controller';
import { PublishService } from './publish.service';
import { PublishWorker } from './publish.worker';
import { N8nPublishTrigger } from './triggers/n8n-publish.trigger';
import { PUBLISH_TRIGGER } from './triggers/publish-trigger';
import { WebhookController } from './webhook.controller';

// Phase 8-1 발행 큐. C4 = n8n 콜백 webhook + HMAC 검증. (라운드트립 코드 완성)
// SupabaseModule 은 @Global 이라 재import 불필요. 가드(WebhookHmacGuard)는 ConfigService(@Global)로 자동 resolve.
@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [PublishController, WebhookController],
  providers: [
    PublishService,
    PublishWorker,
    { provide: PUBLISH_TRIGGER, useClass: N8nPublishTrigger },
  ],
})
export class PublishModule {}
