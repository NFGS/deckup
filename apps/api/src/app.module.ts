import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AiModule } from './ai.module.js';
import { AnalyticsModule } from './analytics.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth.module.js';
import { CardsModule } from './cards.module.js';
import { DecksModule } from './decks.module.js';
import { AppConfigModule } from './infrastructure/config/app-config.module.js';
import { AiProviderModule } from './infrastructure/ai/ai-provider.module.js';
import { CsvModule } from './infrastructure/csv/csv.module.js';
import { PersistenceModule } from './infrastructure/prisma/persistence.module.js';
import { PrismaModule } from './infrastructure/prisma/prisma.module.js';
import { SchedulingModule } from './infrastructure/scheduling/scheduling.module.js';
import { SecurityModule } from './infrastructure/security/security.module.js';
import { DomainExceptionFilter } from './presentation/common/filters/domain-exception.filter.js';
import { JwtAuthGuard } from './presentation/common/guards/jwt-auth.guard.js';
import { ImportsModule } from './imports.module.js';
import { PublicDecksModule } from './public-decks.module.js';
import { StudyModule } from './study.module.js';
import { UsersModule } from './users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    AppConfigModule,
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    PrismaModule,
    PersistenceModule,
    SecurityModule,
    SchedulingModule,
    CsvModule,
    AiProviderModule,
    AuthModule,
    UsersModule,
    PublicDecksModule,
    DecksModule,
    CardsModule,
    StudyModule,
    AnalyticsModule,
    ImportsModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}
