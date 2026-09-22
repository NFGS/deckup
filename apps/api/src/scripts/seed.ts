import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module.js';
import { CreateCardUseCase } from '../application/cards/create-card.use-case.js';
import { CreateDeckUseCase } from '../application/decks/create-deck.use-case.js';
import { User } from '../domain/entities/user.entity.js';
import { PasswordHasherPort } from '../domain/ports/password-hasher.port.js';
import { UserRepositoryPort } from '../domain/ports/user.repository.js';
import { Email } from '../domain/value-objects/email.vo.js';

const DEMO_EMAIL = process.env.SEED_EMAIL ?? 'demo@deckup.local';
const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'deckup-demo-1';

const DEMO_CARDS = [
  {
    front: 'What is mitosis?',
    back: 'A type of cell division that produces two identical daughter cells.',
    hint: 'Think about growth and repair.',
    difficulty: 'EASY' as const,
  },
  {
    front: 'Which organelle produces ATP?',
    back: 'The mitochondrion, through cellular respiration.',
    hint: 'The powerhouse of the cell.',
    difficulty: 'EASY' as const,
  },
  {
    front: 'What is the function of ribosomes?',
    back: 'They translate messenger RNA into proteins.',
    hint: 'Protein synthesis.',
    difficulty: 'MEDIUM' as const,
  },
  {
    front: 'What happens during meiosis?',
    back: 'Four haploid gametes are produced from one diploid cell.',
    hint: 'It halves the chromosome number.',
    difficulty: 'MEDIUM' as const,
  },
  {
    front: 'What is osmosis?',
    back: 'The diffusion of water across a semipermeable membrane.',
    hint: 'Water moves to the more concentrated side.',
    difficulty: 'HARD' as const,
  },
];

async function seed(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const users = app.get(UserRepositoryPort);
    const hasher = app.get(PasswordHasherPort);
    const createDeck = app.get(CreateDeckUseCase);
    const createCard = app.get(CreateCardUseCase);

    const email = Email.create(DEMO_EMAIL);
    const existing = await users.findByEmail(email);

    if (existing) {
      Logger.log(`Demo account ${DEMO_EMAIL} already exists — nothing to do.`, 'Seed');
      return;
    }

    const user = User.create({
      email,
      passwordHash: await hasher.hash(DEMO_PASSWORD),
      displayName: 'Demo Student',
      timezone: 'America/Bogota',
    });
    await users.create(user);

    const { deck } = await createDeck.execute(user.id, {
      title: 'Biology — Final exam demo',
      subject: 'Biology',
      description: 'Sample deck created by the seed script to explore DeckUp.',
      visibility: 'PRIVATE',
      tags: ['demo', 'biology'],
    });

    for (const card of DEMO_CARDS) {
      await createCard.execute(deck.id, user.id, { ...card, tags: ['demo'] });
    }

    Logger.log(
      `Seeded ${DEMO_CARDS.length} cards for ${DEMO_EMAIL} (password: ${DEMO_PASSWORD}).`,
      'Seed',
    );
  } finally {
    await app.close();
  }
}

await seed();
