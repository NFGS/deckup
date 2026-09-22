import type { User as UserResponse } from '@deckup/shared';

import type { User } from '../../../domain/entities/user.entity.js';

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email.value,
    displayName: user.displayName,
    timezone: user.timezone,
    createdAt: user.createdAt.toISOString(),
  };
}
