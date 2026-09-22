import { Body, Controller, Get, Patch } from '@nestjs/common';
import { updateUserSchema } from '@deckup/shared';
import type { AccessTokenPayload, UpdateUser, User as UserResponse } from '@deckup/shared';

import { GetCurrentUserUseCase } from '../application/users/get-current-user.use-case.js';
import { UpdateUserUseCase } from '../application/users/update-user.use-case.js';
import { CurrentUser } from './common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe.js';
import { toUserResponse } from './common/presenters/user.presenter.js';

@Controller('users')
export class UsersController {
  constructor(
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly updateUser: UpdateUserUseCase,
  ) {}

  @Get('me')
  async me(@CurrentUser() user: AccessTokenPayload): Promise<UserResponse> {
    return toUserResponse(await this.getCurrentUser.execute(user.sub));
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUser,
  ): Promise<UserResponse> {
    return toUserResponse(await this.updateUser.execute(user.sub, body));
  }
}
