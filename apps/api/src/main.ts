import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

import { AppModule } from './app.module.js';
import { createFastifyAdapter } from './bootstrap/fastify-adapter.js';
import { registerPlugins } from './bootstrap/register-plugins.js';
import { loadEnv } from './infrastructure/config/env.validation.js';

// Load the local env files before validating, mirroring the Nest ConfigModule
// (which loads them later). Missing files are fine: in containers the values
// come from the platform environment.
for (const envFile of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(envFile);
  } catch {
    // No local file to load.
  }
}

async function bootstrap(): Promise<void> {
  const env = loadEnv(new ConfigService(process.env));

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // Structured request logs with a correlation id (NFR-07).
    createFastifyAdapter({
      logger: { level: env.LOG_LEVEL },
      trustProxy: env.TRUST_PROXY,
    }),
  );

  await registerPlugins(app);

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: env.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  });
  app.enableShutdownHooks();

  await app.listen(env.PORT, '0.0.0.0');

  Logger.log(`DeckUp API listening on http://localhost:${env.PORT}/api/v1`, 'Bootstrap');
}

await bootstrap();
