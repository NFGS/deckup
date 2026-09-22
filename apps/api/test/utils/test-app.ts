import { Test } from '@nestjs/testing';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { ThrottlerStorage } from '@nestjs/throttler';
import fastifyCookie from '@fastify/cookie';

import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service.js';

export interface TestAppOptions {
  /**
   * When false (default), the throttler storage always allows requests so
   * functional tests are not affected by rate limits.
   */
  throttling?: boolean;
}

const allowAllThrottlerStorage = {
  increment: () =>
    Promise.resolve({
      totalHits: 1,
      timeToExpire: 60,
      isBlocked: false,
      timeToBlockExpire: 0,
    }),
};

export async function createTestApp(options: TestAppOptions = {}): Promise<NestFastifyApplication> {
  const builder = Test.createTestingModule({ imports: [AppModule] });

  if (!options.throttling) {
    builder.overrideProvider(ThrottlerStorage).useValue(allowAllThrottlerStorage);
  }

  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.register(fastifyCookie);
  app.setGlobalPrefix('api/v1');
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return app;
}

export async function resetDatabase(app: NestFastifyApplication): Promise<void> {
  const prisma = app.get(PrismaService);

  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "card_tags", "deck_tags", "cards", "decks", "tags", "refresh_tokens", "users" RESTART IDENTITY CASCADE',
  );
}
