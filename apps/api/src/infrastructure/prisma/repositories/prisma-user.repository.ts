import { Injectable } from '@nestjs/common';

import { User } from '../../../domain/entities/user.entity.js';
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
