import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { API_PREFIX, registerAccount } from './utils/auth.js';
import { createTestApp, resetDatabase } from './utils/test-app.js';

interface SessionBody {
  id: string;
  deckId: string;
  mode: string;
  status: string;
  cardsReviewed: number;
  correctCount: number;
}

interface QueueBody {
  sessionId: string;
  items: { cardId: string; state: string; isNew: boolean }[];
  remaining: number;
}

interface ReviewBody {
  cardId: string;
  rating: string;
  nextDueAt: string;
  scheduledDays: number;
  state: string;
  remaining: number;
}

const SECOND_ACCOUNT = {
  email: 'beto@example.com',
  password: 'super-secret-2',
  displayName: 'Beto',
};

describe('Study (e2e)', () => {
  let app: NestFastifyApplication;
  let token: string;
  let otherToken: string;
  let deckId: string;
  let cardIds: string[];

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
    cardIds = [await createCard('Question 1'), await createCard('Question 2')];
  });

  const server = () => app.getHttpServer();
  const auth = (value: string) => ({ Authorization: `Bearer ${value}` });

  async function createDeck(accessToken = token): Promise<string> {
    const response = await request(server())
      .post(`${API_PREFIX}/decks`)
      .set(auth(accessToken))
      .send({ title: 'Biology — Unit 3' })
      .expect(201);

    return (response.body as { id: string }).id;
  }

  async function createCard(front: string, targetDeckId = deckId): Promise<string> {
    const response = await request(server())
      .post(`${API_PREFIX}/decks/${targetDeckId}/cards`)
      .set(auth(token))
      .send({ front, back: 'Answer' })
      .expect(201);

    return (response.body as { id: string }).id;
  }

  async function startSession(mode = 'DUE', accessToken = token): Promise<SessionBody> {
    const response = await request(server())
      .post(`${API_PREFIX}/decks/${deckId}/study-sessions`)
      .set(auth(accessToken))
      .send({ mode })
      .expect(201);

    return response.body as SessionBody;
  }

  async function getQueue(sessionId: string, accessToken = token): Promise<QueueBody> {
    const response = await request(server())
      .get(`${API_PREFIX}/study-sessions/${sessionId}/queue`)
      .set(auth(accessToken))
      .expect(200);

    return response.body as QueueBody;
  }

  async function review(
    sessionId: string,
    cardId: string,
    rating: string,
    accessToken = token,
  ): Promise<ReviewBody> {
    const response = await request(server())
      .post(`${API_PREFIX}/study-sessions/${sessionId}/reviews`)
      .set(auth(accessToken))
      .send({ cardId, rating })
      .expect(200);

    return response.body as ReviewBody;
  }

  it('runs a full study session and schedules the cards', async () => {
    const session = await startSession();

    expect(session.status).toBe('ACTIVE');
    expect(session.mode).toBe('DUE');

    const queue = await getQueue(session.id);

    expect(queue.items).toHaveLength(2);
    expect(queue.remaining).toBe(2);
    expect(queue.items.every((item) => item.isNew)).toBe(true);

    const firstCardId = queue.items[0]?.cardId ?? '';
    const secondCardId = queue.items[1]?.cardId ?? '';

    const good = await review(session.id, firstCardId, 'GOOD');
    expect(good.state).toBe('LEARNING');
    expect(good.remaining).toBe(1);
    expect(new Date(good.nextDueAt).getTime()).toBeGreaterThan(Date.now());

    const again = await review(session.id, secondCardId, 'AGAIN');
    expect(again.state).toBe('LEARNING');
    expect(again.remaining).toBe(0);

    const summary = await request(server())
      .post(`${API_PREFIX}/study-sessions/${session.id}/complete`)
      .set(auth(token))
      .expect(200);

    expect(summary.body).toMatchObject({ cardsReviewed: 2, correctCount: 1, accuracy: 0.5 });
  });

  it('schedules cards out of the due queue and supports review ahead', async () => {
    const session = await startSession();
    const queue = await getQueue(session.id);

    for (const item of queue.items) {
      await review(session.id, item.cardId, 'EASY');
    }

    await request(server())
      .post(`${API_PREFIX}/study-sessions/${session.id}/complete`)
      .set(auth(token))
      .expect(200);

    const deck = await request(server())
      .get(`${API_PREFIX}/decks/${deckId}`)
      .set(auth(token))
      .expect(200);

    expect(deck.body).toMatchObject({ cardCount: 2, dueCount: 0 });

    const dueSession = await startSession('DUE');
    const dueQueue = await getQueue(dueSession.id);
    expect(dueQueue.items).toHaveLength(0);

    const aheadSession = await startSession('AHEAD');
    const aheadQueue = await getQueue(aheadSession.id);

    expect(aheadQueue.items).toHaveLength(2);
    expect(aheadQueue.items.every((item) => item.isNew === false)).toBe(true);
  });

  it('rejects reviews for cards outside the session deck', async () => {
    const otherDeckId = await createDeck();
    const foreignCardId = await createCard('Foreign question', otherDeckId);
    const session = await startSession();

    await request(server())
      .post(`${API_PREFIX}/study-sessions/${session.id}/reviews`)
      .set(auth(token))
      .send({ cardId: foreignCardId, rating: 'GOOD' })
      .expect(404);
  });

  it('isolates sessions between students', async () => {
    const session = await startSession();

    await request(server())
      .get(`${API_PREFIX}/study-sessions/${session.id}/queue`)
      .set(auth(otherToken))
      .expect(404);

    await request(server())
      .post(`${API_PREFIX}/study-sessions/${session.id}/reviews`)
      .set(auth(otherToken))
      .send({ cardId: cardIds[0], rating: 'GOOD' })
      .expect(404);
  });

  it('rejects queue access after completion', async () => {
    const session = await startSession();

    await request(server())
      .post(`${API_PREFIX}/study-sessions/${session.id}/complete`)
      .set(auth(token))
      .expect(200);

    await request(server())
      .get(`${API_PREFIX}/study-sessions/${session.id}/queue`)
      .set(auth(token))
      .expect(409);
  });

  it('validates the review payload', async () => {
    const session = await startSession();

    await request(server())
      .post(`${API_PREFIX}/study-sessions/${session.id}/reviews`)
      .set(auth(token))
      .send({ cardId: cardIds[0], rating: 'PERFECT' })
      .expect(422);
  });

  it('resumes the active session instead of creating a new one', async () => {
    const first = await startSession();
    const second = await startSession();

    expect(second.id).toBe(first.id);
  });

  it('abandons a session and blocks further reviews', async () => {
    const session = await startSession();

    const abandoned = await request(server())
      .post(`${API_PREFIX}/study-sessions/${session.id}/abandon`)
      .set(auth(token))
      .expect(200);

    expect(abandoned.body).toMatchObject({ id: session.id, status: 'ABANDONED' });

    await request(server())
      .post(`${API_PREFIX}/study-sessions/${session.id}/reviews`)
      .set(auth(token))
      .send({ cardId: cardIds[0], rating: 'GOOD' })
      .expect(409);

    await request(server())
      .post(`${API_PREFIX}/study-sessions/${session.id}/complete`)
      .set(auth(token))
      .expect(409);

    const restarted = await startSession();
    expect(restarted.id).not.toBe(session.id);
  });

  it('applies a replayed review only once (idempotency)', async () => {
    const session = await startSession();
    const clientReviewId = '11111111-2222-4333-8444-555555555555';

    const first = await request(server())
      .post(`${API_PREFIX}/study-sessions/${session.id}/reviews`)
      .set(auth(token))
      .send({ cardId: cardIds[0], rating: 'GOOD', clientReviewId })
      .expect(200);

    const replay = await request(server())
      .post(`${API_PREFIX}/study-sessions/${session.id}/reviews`)
      .set(auth(token))
      .send({ cardId: cardIds[0], rating: 'GOOD', clientReviewId })
      .expect(200);

    const firstBody = first.body as ReviewBody;
    const replayBody = replay.body as ReviewBody;

    expect(replayBody).toMatchObject({
      cardId: firstBody.cardId,
      nextDueAt: firstBody.nextDueAt,
    });

    const summary = await request(server())
      .post(`${API_PREFIX}/study-sessions/${session.id}/complete`)
      .set(auth(token))
      .expect(200);

    expect(summary.body).toMatchObject({ cardsReviewed: 1, correctCount: 1 });
  });

  it('graduates a card to review after consecutive Good ratings', async () => {
    const session = await startSession();

    const first = await request(server())
      .post(`${API_PREFIX}/study-sessions/${session.id}/reviews`)
      .set(auth(token))
      .send({ cardId: cardIds[0], rating: 'GOOD' })
      .expect(200);

    expect((first.body as ReviewBody).state).toBe('LEARNING');

    const second = await request(server())
      .post(`${API_PREFIX}/study-sessions/${session.id}/reviews`)
      .set(auth(token))
      .send({ cardId: cardIds[0], rating: 'GOOD' })
      .expect(200);

    const secondBody = second.body as ReviewBody;
    expect(secondBody.state).toBe('REVIEW');
    expect(secondBody.scheduledDays).toBeGreaterThanOrEqual(1);
  });

  it('applies concurrent replays of the same review exactly once', async () => {
    const session = await startSession();
    const clientReviewId = '22222222-3333-4444-8555-666666666666';
    const review = () =>
      request(server())
        .post(`${API_PREFIX}/study-sessions/${session.id}/reviews`)
        .set(auth(token))
        .send({ cardId: cardIds[0], rating: 'GOOD', clientReviewId });

    const [first, second] = await Promise.all([review(), review()]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((first.body as ReviewBody).nextDueAt).toBe((second.body as ReviewBody).nextDueAt);

    const summary = await request(server())
      .post(`${API_PREFIX}/study-sessions/${session.id}/complete`)
      .set(auth(token))
      .expect(200);

    expect(summary.body).toMatchObject({ cardsReviewed: 1, correctCount: 1 });
  });

  it('rejects reusing a review id for a different card', async () => {
    const session = await startSession();
    const clientReviewId = '33333333-4444-4555-8666-777777777777';

    await request(server())
      .post(`${API_PREFIX}/study-sessions/${session.id}/reviews`)
      .set(auth(token))
      .send({ cardId: cardIds[0], rating: 'GOOD', clientReviewId })
      .expect(200);

    await request(server())
      .post(`${API_PREFIX}/study-sessions/${session.id}/reviews`)
      .set(auth(token))
      .send({ cardId: cardIds[1], rating: 'GOOD', clientReviewId })
      .expect(409);
  });

  it('serializes concurrent reviews of the same card', async () => {
    const session = await startSession();
    const review = (rating: string) =>
      request(server())
        .post(`${API_PREFIX}/study-sessions/${session.id}/reviews`)
        .set(auth(token))
        .send({ cardId: cardIds[0], rating });

    const responses = await Promise.all([review('GOOD'), review('GOOD')]);

    expect(responses.map((response) => response.status)).toEqual([200, 200]);

    const summary = await request(server())
      .post(`${API_PREFIX}/study-sessions/${session.id}/complete`)
      .set(auth(token))
      .expect(200);

    expect(summary.body).toMatchObject({ cardsReviewed: 2, correctCount: 2 });
  });
});
