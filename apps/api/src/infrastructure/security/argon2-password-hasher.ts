import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

import { PasswordHasherPort } from '../../domain/ports/password-hasher.port.js';

/**
 * OWASP-recommended Argon2id parameters (19 MiB, 2 iterations, 1 lane).
 */
const ARGON2_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

@Injectable()
export class Argon2PasswordHasher extends PasswordHasherPort {
  async hash(plainPassword: string): Promise<string> {
    return hash(plainPassword, ARGON2_OPTIONS);
  }

  async verify(passwordHash: string, plainPassword: string): Promise<boolean> {
    return verify(passwordHash, plainPassword);
  }
}
