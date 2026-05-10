import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { GeminiModule } from '@/gemini/gemini.module';
import { HealthModule } from '@/health/health.module';
import { SupabaseModule } from '@/supabase/supabase.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
