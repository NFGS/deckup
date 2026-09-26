import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { API_PREFIX, registerAccount } from './utils/auth.js';
import { createTestApp, resetDatabase } from './utils/test-app.js';

interface DeckBody {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  visibility: string;
  tags: string[];
  cardCount: number;
  dueCount: number;
}

const SECOND_ACCOUNT = {
  email: 'beto@example.com',
  password: 'super-secret-2',
  displayName: 'Beto',
};

describe('Decks (e2e)', () => {
  let app: NestFastifyApplication;
  let token: string;
  let otherToken: string;

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
  });

  const server = () => app.getHttpServer();
  const auth = (value: string) => ({ Authorization: `Bearer ${value}` });

  async function createDeck(
    overrides: Record<string, unknown> = {},
    accessToken = token,
  ): Promise<DeckBody> {
    const response = await request(server())
      .post(`${API_PREFIX}/decks`)
      .set(auth(accessToken))
      .send({ title: 'Biology — Unit 3', ...overrides })
      .expect(201);

    return response.body as DeckBody;
  }

  it('creates a deck with defaults', async () => {
    const deck = await createDeck();

    expect(deck.title).toBe('Biology — Unit 3');
    expect(deck.visibility).toBe('PRIVATE');
    expect(deck.tags).toEqual([]);
    expect(deck.cardCount).toBe(0);
    expect(deck.dueCount).toBe(0);
  });

  it('rejects invalid payloads with 422', async () => {
    await request(server())
      .post(`${API_PREFIX}/decks`)
      .set(auth(token))
      .send({ title: '   ', color: 'blue' })
      .expect(422);
  });

  it('lists decks with counters and pagination metadata', async () => {
    await createDeck();
    await createDeck({ title: 'History — Final', subject: 'History' });

    const response = await request(server())
      .get(`${API_PREFIX}/decks`)
      .set(auth(token))
      .expect(200);

    const body = response.body as { items: DeckBody[]; total: number; page: number };

    expect(body.total).toBe(2);
    expect(body.page).toBe(1);
    expect(body.items).toHaveLength(2);
  });

  it('returns a deck by id', async () => {
    const deck = await createDeck();

    const response = await request(server())
      .get(`${API_PREFIX}/decks/${deck.id}`)
      .set(auth(token))
      .expect(200);

    expect((response.body as DeckBody).id).toBe(deck.id);
  });

  it('isolates decks between students', async () => {
    const deck = await createDeck();

    await request(server()).get(`${API_PREFIX}/decks/${deck.id}`).set(auth(otherToken)).expect(404);

    await request(server())
      .patch(`${API_PREFIX}/decks/${deck.id}`)
      .set(auth(otherToken))
      .send({ title: 'Stolen' })
      .expect(404);
  });

  it('updates metadata and normalizes tags', async () => {
    const deck = await createDeck();

    const response = await request(server())
      .patch(`${API_PREFIX}/decks/${deck.id}`)
      .set(auth(token))
      .send({
        title: 'Biology — Final',
        subject: 'Biology',
        visibility: 'UNLISTED',
        tags: [' Exam-1 ', 'exam-1', 'Final'],
      })
      .expect(200);

    const body = response.body as DeckBody;

    expect(body.title).toBe('Biology — Final');
    expect(body.subject).toBe('Biology');
    expect(body.visibility).toBe('UNLISTED');
    expect(body.tags).toEqual(['exam-1', 'final']);
  });

  it('filters by subject', async () => {
    await createDeck({ subject: 'Biology' });
    await createDeck({ title: 'History — Final', subject: 'History' });

    const response = await request(server())
      .get(`${API_PREFIX}/decks?subject=History`)
      .set(auth(token))
      .expect(200);

    const body = response.body as { items: DeckBody[]; total: number };

    expect(body.total).toBe(1);
    expect(body.items[0]?.title).toBe('History — Final');
  });

  it('lists the distinct subjects of the student only', async () => {
    await createDeck({ subject: 'Biology' });
    await createDeck({ title: 'Biology — Unit 4', subject: 'Biology' });
    await createDeck({ title: 'History — Final', subject: 'History' });
    await createDeck({ title: 'No subject' });
    await createDeck({ title: 'Beto deck', subject: 'Maths' }, otherToken);

    const response = await request(server())
      .get(`${API_PREFIX}/decks/subjects`)
      .set(auth(token))
      .expect(200);

    expect(response.body).toEqual({ subjects: ['Biology', 'History'] });
  });

  it('soft deletes a deck and removes it from listings', async () => {
    const deck = await createDeck();

    await request(server()).delete(`${API_PREFIX}/decks/${deck.id}`).set(auth(token)).expect(204);
    await request(server()).get(`${API_PREFIX}/decks/${deck.id}`).set(auth(token)).expect(404);

    const response = await request(server())
      .get(`${API_PREFIX}/decks`)
      .set(auth(token))
      .expect(200);
    expect((response.body as { total: number }).total).toBe(0);
  });

  it('rejects malformed deck ids with 400', async () => {
    await request(server()).get(`${API_PREFIX}/decks/not-a-uuid`).set(auth(token)).expect(400);
  });
});
