import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

// Phase 8-1 발행 큐. C1 = 골격(스키마 + ScheduleModule). C2 서비스/API, C3 워커/트리거, C4 콜백.
// SupabaseModule 은 @Global 이라 재import 불필요.
@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [],
  providers: [],
})
export class PublishModule {}
