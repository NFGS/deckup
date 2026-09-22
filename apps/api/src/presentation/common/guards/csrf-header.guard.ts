import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { UnauthorizedError } from '../../../domain/errors/domain-errors.js';
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from '../http/refresh-cookie.js';

@Injectable()
export class CsrfHeaderGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    if (request.headers[CSRF_HEADER_NAME] !== CSRF_HEADER_VALUE) {
      throw new UnauthorizedError('Missing CSRF protection header');
    }

    return true;
  }
}
