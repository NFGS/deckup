import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { API_PREFIX, registerAccount } from './utils/auth.js';
import { createTestApp, resetDatabase } from './utils/test-app.js';

interface ForecastDay {
  date: string;
  dueCount: number;
}

describe('Analytics (e2e)', () => {
  let app: NestFastifyApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    token = await registerAccount(app);
  });

  const server = () => app.getHttpServer();
  const auth = () => ({ Authorization: `Bearer ${token}` });

  async function seedStudiedDeck(): Promise<void> {
    const deck = await request(server())
      .post(`${API_PREFIX}/decks`)
      .set(auth())
      .send({ title: 'Biology — Unit 3' })
      .expect(201);
    const deckId = (deck.body as { id: string }).id;

    for (const front of ['Question 1', 'Question 2']) {
      await request(server())
        .post(`${API_PREFIX}/decks/${deckId}/cards`)
        .set(auth())
        .send({ front, back: 'Answer' })
        .expect(201);
    }

    const session = await request(server())
      .post(`${API_PREFIX}/decks/${deckId}/study-sessions`)
      .set(auth())
      .send({ mode: 'DUE' })
      .expect(201);
    const sessionId = (session.body as { id: string }).id;

    const queue = await request(server())
      .get(`${API_PREFIX}/study-sessions/${sessionId}/queue`)
      .set(auth())
      .expect(200);
    const [first, second] = (queue.body as { items: { cardId: string }[] }).items;

    if (!first || !second) {
      throw new Error('Expected two cards in the study queue');
    }

    await request(server())
      .post(`${API_PREFIX}/study-sessions/${sessionId}/reviews`)
      .set(auth())
      .send({ cardId: first.cardId, rating: 'GOOD' })
      .expect(200);

    await request(server())
      .post(`${API_PREFIX}/study-sessions/${sessionId}/reviews`)
      .set(auth())
      .send({ cardId: second.cardId, rating: 'AGAIN' })
      .expect(200);

    await request(server())
      .post(`${API_PREFIX}/study-sessions/${sessionId}/complete`)
      .set(auth())
      .expect(200);
  }

  it('returns zeroed metrics for a fresh account', async () => {
    const overview = await request(server())
      .get(`${API_PREFIX}/analytics/overview`)
      .set(auth())
      .expect(200);

    expect(overview.body).toEqual({
      streak: 0,
      reviewsToday: 0,
      dueToday: 0,
      retention30d: 0,
      totalCards: 0,
      totalDecks: 0,
    });

    const forecast = await request(server())
      .get(`${API_PREFIX}/analytics/forecast`)
      .set(auth())
      .expect(200);
    const days = (forecast.body as { days: ForecastDay[] }).days;

    expect(days).toHaveLength(7);
    expect(days.every((day) => day.dueCount === 0)).toBe(true);
  });

  it('summarises study activity after a session', async () => {
    await seedStudiedDeck();

    const overview = await request(server())
      .get(`${API_PREFIX}/analytics/overview`)
      .set(auth())
      .expect(200);

    expect(overview.body).toMatchObject({
      streak: 1,
      reviewsToday: 2,
      dueToday: 0,
      retention30d: 0.5,
      totalCards: 2,
      totalDecks: 1,
    });

    const forecast = await request(server())
      .get(`${API_PREFIX}/analytics/forecast?days=7`)
      .set(auth())
      .expect(200);
    const days = (forecast.body as { days: ForecastDay[] }).days;

    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ date: todayKey(), dueCount: 2 });
    expect(days.slice(1).every((day) => day.dueCount === 0)).toBe(true);
  });

  it('honours the forecast window and validates it', async () => {
    const forecast = await request(server())
      .get(`${API_PREFIX}/analytics/forecast?days=14`)
      .set(auth())
      .expect(200);

    expect((forecast.body as { days: unknown[] }).days).toHaveLength(14);

    await request(server()).get(`${API_PREFIX}/analytics/forecast?days=0`).set(auth()).expect(422);
    await request(server()).get(`${API_PREFIX}/analytics/forecast?days=99`).set(auth()).expect(422);
  });

  it('protects the analytics endpoints', async () => {
    await request(server()).get(`${API_PREFIX}/analytics/overview`).expect(401);
  });
});

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
