import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { PasswordHasherPort } from '../../domain/ports/password-hasher.port.js';
import { TokenServicePort } from '../../domain/ports/token-service.port.js';
import { Argon2PasswordHasher } from './argon2-password-hasher.js';
import { JWT_AUDIENCE, JWT_ISSUER, JwtTokenService } from './jwt-token.service.js';

const DEFAULT_ACCESS_TTL_SECONDS = 900;

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: Number(
            config.get<string>('JWT_ACCESS_TTL_SECONDS') ?? DEFAULT_ACCESS_TTL_SECONDS,
          ),
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
        },
      }),
    }),
  ],
  providers: [
    { provide: PasswordHasherPort, useClass: Argon2PasswordHasher },
    { provide: TokenServicePort, useClass: JwtTokenService },
  ],
  exports: [PasswordHasherPort, TokenServicePort],
})
export class SecurityModule {}
