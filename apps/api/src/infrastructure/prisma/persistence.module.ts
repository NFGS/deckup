import { Global, Module } from '@nestjs/common';

import { CardRepositoryPort } from '../../domain/ports/card.repository.js';
import { DeckRepositoryPort } from '../../domain/ports/deck.repository.js';
import { RefreshTokenRepositoryPort } from '../../domain/ports/refresh-token.repository.js';
import { UserRepositoryPort } from '../../domain/ports/user.repository.js';
import { PrismaCardRepository } from './repositories/prisma-card.repository.js';
import { PrismaDeckRepository } from './repositories/prisma-deck.repository.js';
import { PrismaRefreshTokenRepository } from './repositories/prisma-refresh-token.repository.js';
import { PrismaUserRepository } from './repositories/prisma-user.repository.js';

@Global()
@Module({
  providers: [
    { provide: UserRepositoryPort, useClass: PrismaUserRepository },
    { provide: RefreshTokenRepositoryPort, useClass: PrismaRefreshTokenRepository },
    { provide: DeckRepositoryPort, useClass: PrismaDeckRepository },
    { provide: CardRepositoryPort, useClass: PrismaCardRepository },
  ],
  exports: [UserRepositoryPort, RefreshTokenRepositoryPort, DeckRepositoryPort, CardRepositoryPort],
})
export class PersistenceModule {}
