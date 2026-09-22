import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

import { AppModule } from './app.module.js';
import { createFastifyAdapter } from './bootstrap/fastify-adapter.js';
import { registerPlugins } from './bootstrap/register-plugins.js';

function resolveCorsOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // Structured request logs with a correlation id (NFR-07).
    createFastifyAdapter({ logger: { level: process.env.LOG_LEVEL ?? 'info' } }),
  );

  await registerPlugins(app);

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: resolveCorsOrigins(),
    credentials: true,
  });
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');

  Logger.log(`DeckUp API listening on http://localhost:${port}/api/v1`, 'Bootstrap');
}

await bootstrap();
