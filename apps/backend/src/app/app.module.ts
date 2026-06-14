import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DraftsModule } from '@/drafts/drafts.module';
import { HealthModule } from '@/health/health.module';
import { InterviewModule } from '@/interview/interview.module';
import { LlmModule } from '@/llm/llm.module';
import { PublishModule } from '@/publish/publish.module';
import { SupabaseModule } from '@/supabase/supabase.module';
import { TopicsModule } from '@/topics/topics.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    HealthModule,
    LlmModule,
    InterviewModule,
    TopicsModule,
    DraftsModule,
    PublishModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
