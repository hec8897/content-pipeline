import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
  await app.listen(port);
  Logger.log(`🚀 content-pipeline backend on http://localhost:${port}/api`);
}

bootstrap().catch((err) => {
  Logger.error('Failed to bootstrap', err);
  process.exit(1);
});
