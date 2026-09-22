import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { API_PREFIX, registerAccount } from './utils/auth.js';
import { createTestApp, resetDatabase } from './utils/test-app.js';

const AUTHOR = { email: 'author@example.com', password: 'super-secret-1', displayName: 'Ana' };
const VISITOR = { email: 'visitor@example.com', password: 'super-secret-2', displayName: 'Beto' };

interface DeckBody {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  cardCount: number;
  authorName?: string;
}

describe('Public decks (e2e)', () => {
  let app: NestFastifyApplication;
  let authorToken: string;
  let visitorToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    authorToken = await registerAccount(app, AUTHOR);
    visitorToken = await registerAccount(app, VISITOR);
  });

  const server = () => app.getHttpServer();
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function createDeck(
    token: string,
    overrides: Record<string, unknown> = {},
  ): Promise<DeckBody> {
    const response = await request(server())
      .post(`${API_PREFIX}/decks`)
      .set(auth(token))
      .send({ title: 'Biology — Unit 3', ...overrides })
      .expect(201);

    return response.body as DeckBody;
  }

  async function addCard(token: string, deckId: string, front: string): Promise<void> {
    await request(server())
      .post(`${API_PREFIX}/decks/${deckId}/cards`)
      .set(auth(token))
      .send({ front, back: 'Answer' })
      .expect(201);
  }

  it('lists only public decks with their author', async () => {
    const publicDeck = await createDeck(authorToken, {
      title: 'Public Biology',
      visibility: 'PUBLIC',
      subject: 'Biology',
    });
    await createDeck(authorToken, { title: 'Private History', visibility: 'PRIVATE' });

    const response = await request(server())
      .get(`${API_PREFIX}/decks/public`)
      .set(auth(visitorToken))
      .expect(200);

    const body = response.body as { items: DeckBody[]; total: number };

    expect(body.total).toBe(1);
    expect(body.items[0]?.id).toBe(publicDeck.id);
    expect(body.items[0]?.authorName).toBe('Ana');
  });

  it('filters public decks by search and subject', async () => {
    await createDeck(authorToken, {
      title: 'Public Biology',
      visibility: 'PUBLIC',
      subject: 'Biology',
    });
    await createDeck(authorToken, {
      title: 'Public History',
      visibility: 'PUBLIC',
      subject: 'History',
    });

    const bySubject = await request(server())
      .get(`${API_PREFIX}/decks/public?subject=History`)
      .set(auth(visitorToken))
      .expect(200);
    expect((bySubject.body as { total: number }).total).toBe(1);

    const bySearch = await request(server())
      .get(`${API_PREFIX}/decks/public?q=biology`)
      .set(auth(visitorToken))
      .expect(200);
    expect((bySearch.body as { total: number }).total).toBe(1);
  });

  it('clones a public deck with its cards and attribution', async () => {
    const source = await createDeck(authorToken, {
      title: 'Public Biology',
      visibility: 'PUBLIC',
      tags: ['unit-3'],
    });
    await addCard(authorToken, source.id, 'What is mitosis?');
    await addCard(authorToken, source.id, 'What is osmosis?');

    const response = await request(server())
      .post(`${API_PREFIX}/decks/${source.id}/clone`)
      .set(auth(visitorToken))
      .send({})
      .expect(201);

    const copy = response.body as DeckBody;

    expect(copy.id).not.toBe(source.id);
    expect(copy.title).toBe('Public Biology');
    expect(copy.visibility).toBe('PRIVATE');
    expect(copy.cardCount).toBe(2);
    expect(copy.description).toContain('Cloned from "Public Biology" by Ana');

    const list = await request(server())
      .get(`${API_PREFIX}/decks`)
      .set(auth(visitorToken))
      .expect(200);
    expect((list.body as { total: number }).total).toBe(1);

    const session = await request(server())
      .post(`${API_PREFIX}/decks/${copy.id}/study-sessions`)
      .set(auth(visitorToken))
      .send({ mode: 'DUE' })
      .expect(201);
    const queue = await request(server())
      .get(`${API_PREFIX}/study-sessions/${(session.body as { id: string }).id}/queue`)
      .set(auth(visitorToken))
      .expect(200);

    expect((queue.body as { items: unknown[] }).items).toHaveLength(2);
  });

  it('accepts a custom title when cloning', async () => {
    const source = await createDeck(authorToken, { visibility: 'PUBLIC' });

    const response = await request(server())
      .post(`${API_PREFIX}/decks/${source.id}/clone`)
      .set(auth(visitorToken))
      .send({ title: 'My own copy' })
      .expect(201);

    expect((response.body as DeckBody).title).toBe('My own copy');
  });

  it('rejects cloning a deck you already own', async () => {
    const source = await createDeck(authorToken, { visibility: 'PUBLIC' });

    const response = await request(server())
      .post(`${API_PREFIX}/decks/${source.id}/clone`)
      .set(auth(authorToken))
      .send({})
      .expect(409);

    expect(response.body).toMatchObject({ status: 409 });
  });

  it('hides private and unlisted decks from the catalogue and the clone', async () => {
    const privateDeck = await createDeck(authorToken, { visibility: 'PRIVATE' });
    const unlistedDeck = await createDeck(authorToken, { visibility: 'UNLISTED' });

    const catalogue = await request(server())
      .get(`${API_PREFIX}/decks/public`)
      .set(auth(visitorToken))
      .expect(200);
    expect((catalogue.body as { total: number }).total).toBe(0);

    await request(server())
      .post(`${API_PREFIX}/decks/${privateDeck.id}/clone`)
      .set(auth(visitorToken))
      .send({})
      .expect(404);

    await request(server())
      .post(`${API_PREFIX}/decks/${unlistedDeck.id}/clone`)
      .set(auth(visitorToken))
      .send({})
      .expect(404);
  });

  it('protects the public catalogue with authentication', async () => {
    await request(server()).get(`${API_PREFIX}/decks/public`).expect(401);
  });
});
