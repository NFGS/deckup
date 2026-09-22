import { Injectable } from '@nestjs/common';

import { User } from '../../../domain/entities/user.entity.js';
import { ConflictError } from '../../../domain/errors/domain-errors.js';
import { UserRepositoryPort } from '../../../domain/ports/user.repository.js';
import type { Email } from '../../../domain/value-objects/email.vo.js';
import { PrismaService } from '../prisma.service.js';
import { toDomainUser } from '../mappers/user.mapper.js';

@Injectable()
export class PrismaUserRepository extends UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? toDomainUser(row) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email: email.value } });
    return row ? toDomainUser(row) : null;
  }

  async create(user: User): Promise<void> {
    try {
      await this.prisma.user.create({
        data: {
          id: user.id,
          email: user.email.value,
          passwordHash: user.passwordHash,
          displayName: user.displayName,
          timezone: user.timezone,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      // A concurrent registration with the same email hits the unique index
      // between the use case check and the insert; surface it as a conflict.
      if (isUniqueConstraintError(error)) {
        throw new ConflictError('An account with this email already exists');
      }

      throw error;
    }
  }

  async update(user: User): Promise<void> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        displayName: user.displayName,
        timezone: user.timezone,
        updatedAt: user.updatedAt,
      },
    });
  }
}

function isUniqueConstraintError(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    (value as { code?: unknown }).code === 'P2002'
  );
}
