import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { API_PREFIX, registerAccount } from './utils/auth.js';
import { createTestApp, resetDatabase } from './utils/test-app.js';

interface CardBody {
  id: string;
  deckId: string;
  front: string;
  back: string;
  hint: string | null;
  difficulty: string | null;
  tags: string[];
}

const SECOND_ACCOUNT = {
  email: 'beto@example.com',
  password: 'super-secret-2',
  displayName: 'Beto',
};

describe('Cards (e2e)', () => {
  let app: NestFastifyApplication;
  let token: string;
  let otherToken: string;
  let deckId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    token = await registerAccount(app);
    otherToken = await registerAccount(app, SECOND_ACCOUNT);
    deckId = await createDeck();
  });

  const server = () => app.getHttpServer();
  const auth = (value: string) => ({ Authorization: `Bearer ${value}` });

  async function createDeck(): Promise<string> {
    const response = await request(server())
      .post(`${API_PREFIX}/decks`)
      .set(auth(token))
      .send({ title: 'Biology — Unit 3' })
      .expect(201);

    return (response.body as { id: string }).id;
  }

  async function createCard(overrides: Record<string, unknown> = {}): Promise<CardBody> {
    const response = await request(server())
      .post(`${API_PREFIX}/decks/${deckId}/cards`)
      .set(auth(token))
      .send({ front: 'What is mitosis?', back: 'Cell division', ...overrides })
      .expect(201);

    return response.body as CardBody;
  }

  it('creates a card with optional fields', async () => {
    const card = await createCard({
      hint: 'Think about the nucleus',
      difficulty: 'MEDIUM',
      tags: [' Cell ', 'BIOLOGY'],
    });

    expect(card.front).toBe('What is mitosis?');
    expect(card.hint).toBe('Think about the nucleus');
    expect(card.difficulty).toBe('MEDIUM');
    expect(card.tags).toEqual(['cell', 'biology']);
  });

  it('rejects empty faces with 422', async () => {
    await request(server())
      .post(`${API_PREFIX}/decks/${deckId}/cards`)
      .set(auth(token))
      .send({ front: '   ', back: 'Answer' })
      .expect(422);
  });

  it('lists cards with pagination and search', async () => {
    await createCard();
    await createCard({ front: 'What is osmosis?', back: 'Water diffusion' });

    const all = await request(server())
      .get(`${API_PREFIX}/decks/${deckId}/cards`)
      .set(auth(token))
      .expect(200);

    expect((all.body as { total: number }).total).toBe(2);

    const filtered = await request(server())
      .get(`${API_PREFIX}/decks/${deckId}/cards?q=osmosis`)
      .set(auth(token))
      .expect(200);

    const body = filtered.body as { items: CardBody[]; total: number };

    expect(body.total).toBe(1);
    expect(body.items[0]?.front).toBe('What is osmosis?');
  });

  it('updates a card', async () => {
    const card = await createCard();

    const response = await request(server())
      .patch(`${API_PREFIX}/cards/${card.id}`)
      .set(auth(token))
      .send({ back: 'Updated answer', difficulty: 'HARD', hint: null })
      .expect(200);

    const updated = response.body as CardBody;

    expect(updated.back).toBe('Updated answer');
    expect(updated.difficulty).toBe('HARD');
    expect(updated.hint).toBeNull();
  });

  it('isolates cards between students', async () => {
    const card = await createCard();

    await request(server()).get(`${API_PREFIX}/cards/${card.id}`).set(auth(otherToken)).expect(404);

    await request(server())
      .patch(`${API_PREFIX}/cards/${card.id}`)
      .set(auth(otherToken))
      .send({ back: 'Hijacked' })
      .expect(404);

    await request(server())
      .delete(`${API_PREFIX}/cards/${card.id}`)
      .set(auth(otherToken))
      .expect(404);
  });

  it('returns 404 when the deck does not belong to the student', async () => {
    await request(server())
      .post(`${API_PREFIX}/decks/${deckId}/cards`)
      .set(auth(otherToken))
      .send({ front: 'Question', back: 'Answer' })
      .expect(404);
  });

  it('soft deletes a card', async () => {
    const card = await createCard();

    await request(server()).delete(`${API_PREFIX}/cards/${card.id}`).set(auth(token)).expect(204);
    await request(server()).get(`${API_PREFIX}/cards/${card.id}`).set(auth(token)).expect(404);

    const list = await request(server())
      .get(`${API_PREFIX}/decks/${deckId}/cards`)
      .set(auth(token))
      .expect(200);

    expect((list.body as { total: number }).total).toBe(0);
  });
});
