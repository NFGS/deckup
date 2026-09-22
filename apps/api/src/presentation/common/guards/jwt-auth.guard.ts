import { Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { AccessTokenPayload } from '@deckup/shared';

import { UnauthorizedError } from '../../../domain/errors/domain-errors.js';
import { TokenServicePort } from '../../../domain/ports/token-service.port.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

const BEARER_PREFIX = 'Bearer ';

export type AuthenticatedRequest = FastifyRequest & { user?: AccessTokenPayload };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TokenServicePort) private readonly tokens: TokenServicePort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;

    if (!header || !header.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedError('Missing bearer token');
    }

    try {
      request.user = await this.tokens.verifyAccessToken(header.slice(BEARER_PREFIX.length));
    } catch {
      throw new UnauthorizedError('Invalid or expired access token');
    }

    return true;
  }
}
