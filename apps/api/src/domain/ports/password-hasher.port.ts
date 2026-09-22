export abstract class PasswordHasherPort {
  abstract hash(plainPassword: string): Promise<string>;
  abstract verify(passwordHash: string, plainPassword: string): Promise<boolean>;
}
