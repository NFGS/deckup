import { PasswordHasherPort } from '../../domain/ports/password-hasher.port.js';

export class FakePasswordHasher extends PasswordHasherPort {
  hash(plainPassword: string): Promise<string> {
    return Promise.resolve(`hashed:${plainPassword}`);
  }

  verify(passwordHash: string, plainPassword: string): Promise<boolean> {
    return Promise.resolve(passwordHash === `hashed:${plainPassword}`);
  }
}
