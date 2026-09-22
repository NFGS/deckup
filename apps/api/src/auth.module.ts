import { Module } from '@nestjs/common';

import { LoginUseCase } from './application/auth/login.use-case.js';
import { LogoutUseCase } from './application/auth/logout.use-case.js';
import { RefreshSessionUseCase } from './application/auth/refresh-session.use-case.js';
import { RegisterUserUseCase } from './application/auth/register-user.use-case.js';
import {
  REFRESH_TOKEN_TTL_DAYS,
  SessionIssuer,
} from './application/auth/session-issuer.service.js';
import { APP_ENV } from './infrastructure/config/env.validation.js';
import type { AppEnv } from './infrastructure/config/env.validation.js';
import { AuthController } from './presentation/auth.controller.js';

@Module({
  controllers: [AuthController],
  providers: [
    RegisterUserUseCase,
    LoginUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
    SessionIssuer,
    {
      provide: REFRESH_TOKEN_TTL_DAYS,
      inject: [APP_ENV],
      useFactory: (env: AppEnv) => env.REFRESH_TOKEN_TTL_DAYS,
    },
  ],
})
export class AuthModule {}
