import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { loginSchema, registerSchema } from '@deckup/shared';
import type { AuthSession, LoginInput, RegisterInput } from '@deckup/shared';

import { LoginUseCase } from '../application/auth/login.use-case.js';
import { LogoutUseCase } from '../application/auth/logout.use-case.js';
import { RefreshSessionUseCase } from '../application/auth/refresh-session.use-case.js';
import { RegisterUserUseCase } from '../application/auth/register-user.use-case.js';
import { UnauthorizedError } from '../domain/errors/domain-errors.js';
import { APP_ENV } from '../infrastructure/config/env.validation.js';
import type { AppEnv } from '../infrastructure/config/env.validation.js';
import { Public } from './common/decorators/public.decorator.js';
import { CsrfHeaderGuard } from './common/guards/csrf-header.guard.js';
import {
  clearRefreshCookie,
  REFRESH_COOKIE_NAME,
  setRefreshCookie,
} from './common/http/refresh-cookie.js';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe.js';
import { toUserResponse } from './common/presenters/user.presenter.js';

const registerBody = new ZodValidationPipe(registerSchema);
const loginBody = new ZodValidationPipe(loginSchema);

@Controller('auth')
@Throttle({ default: { limit: 10, ttl: 60_000 } })
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly login: LoginUseCase,
    private readonly refreshSession: RefreshSessionUseCase,
    private readonly logout: LogoutUseCase,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(registerBody) body: RegisterInput,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthSession> {
    const session = await this.registerUser.execute(body);
    setRefreshCookie(reply, session.refreshToken, this.cookieOptions());

    return this.toAuthSession(session);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body(loginBody) body: LoginInput,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthSession> {
    const session = await this.login.execute(body);
    setRefreshCookie(reply, session.refreshToken, this.cookieOptions());

    return this.toAuthSession(session);
  }

  @Public()
  @UseGuards(CsrfHeaderGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthSession> {
    const session = await this.refreshSession.execute(this.readRefreshToken(request));
    setRefreshCookie(reply, session.refreshToken, this.cookieOptions());

    return this.toAuthSession(session);
  }

  @Public()
  @UseGuards(CsrfHeaderGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async signOut(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    const token = request.cookies[REFRESH_COOKIE_NAME];
    if (token) {
      await this.logout.execute(token);
    }
    clearRefreshCookie(reply);
  }

  private readRefreshToken(request: FastifyRequest): string {
    const token = request.cookies[REFRESH_COOKIE_NAME];
    if (!token) {
      throw new UnauthorizedError('Missing refresh token');
    }
    return token;
  }

  private cookieOptions() {
    return { secure: this.env.COOKIE_SECURE, ttlDays: this.env.REFRESH_TOKEN_TTL_DAYS };
  }

  private toAuthSession(session: {
    accessToken: string;
    expiresIn: number;
    user: Parameters<typeof toUserResponse>[0];
  }): AuthSession {
    return {
      accessToken: session.accessToken,
      expiresIn: session.expiresIn,
      user: toUserResponse(session.user),
    };
  }
}
