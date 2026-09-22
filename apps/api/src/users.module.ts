import { Module } from '@nestjs/common';

import { GetCurrentUserUseCase } from './application/users/get-current-user.use-case.js';
import { UpdateUserUseCase } from './application/users/update-user.use-case.js';
import { UsersController } from './presentation/users.controller.js';

@Module({
  controllers: [UsersController],
  providers: [GetCurrentUserUseCase, UpdateUserUseCase],
})
export class UsersModule {}
