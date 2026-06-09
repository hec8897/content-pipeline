import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';

async function bootstrap() {
  // rawBody: true — webhook HMAC 검증이 원본 바디 바이트를 써야 함(JSON 파싱은 그대로 유지).
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  app.enableCors({
    origin: [frontendUrl],
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 content-pipeline backend on http://localhost:${port}/api`);
}

bootstrap().catch((err) => {
  Logger.error('Failed to bootstrap', err);
  process.exit(1);
});
