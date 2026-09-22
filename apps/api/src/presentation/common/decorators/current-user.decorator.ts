import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { AccessTokenPayload } from '@deckup/shared';

import { UnauthorizedError } from '../../../domain/errors/domain-errors.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AccessTokenPayload => {
    const request = context.switchToHttp().getRequest<{ user?: AccessTokenPayload }>();

    if (!request.user) {
      throw new UnauthorizedError('Authentication required');
    }

    return request.user;
  },
);
