import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DraftsModule } from '@/drafts/drafts.module';
import { GeminiModule } from '@/gemini/gemini.module';
import { HealthModule } from '@/health/health.module';
import { InterviewModule } from '@/interview/interview.module';
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
    GeminiModule,
    InterviewModule,
    TopicsModule,
    DraftsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
