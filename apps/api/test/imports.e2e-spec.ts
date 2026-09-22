import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { API_PREFIX, registerAccount } from './utils/auth.js';
import { createTestApp, resetDatabase } from './utils/test-app.js';

const SECOND_ACCOUNT = {
  email: 'beto@example.com',
  password: 'super-secret-2',
  displayName: 'Beto',
};

describe('Imports (e2e)', () => {
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

    const deck = await request(app.getHttpServer())
      .post(`${API_PREFIX}/decks`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ title: 'Biology — Unit 3' })
      .expect(201);

    deckId = (deck.body as { id: string }).id;
  });

  const server = () => app.getHttpServer();
  const auth = (value: string = token) => ({ Authorization: `Bearer ${value}` });

  function uploadCsv(csv: string, filename = 'cards.csv') {
    return request(server())
      .post(`${API_PREFIX}/decks/${deckId}/import`)
      .set(auth())
      .attach('file', Buffer.from(csv, 'utf8'), { filename, contentType: 'text/csv' });
  }

  it('imports a CSV file and reports the summary', async () => {
    const csv = [
      'front,back,hint,difficulty,tags',
      'Q1,A1,think,easy,"unit-3; exam"',
      'Q2,A2,,,',
      ',B2,,,',
    ].join('\r\n');

    const response = await uploadCsv(csv).expect(200);

    expect(response.body).toMatchObject({ imported: 2, skipped: 1 });
    expect((response.body as { errors: { row: number }[] }).errors[0]?.row).toBe(4);

    const list = await request(server())
      .get(`${API_PREFIX}/decks/${deckId}/cards`)
      .set(auth())
      .expect(200);

    expect((list.body as { total: number }).total).toBe(2);
  });

  it('exports a deck as CSV and re-imports it without data loss', async () => {
    await uploadCsv(
      'front,back,hint,difficulty,tags\r\nQ1,A1,think,easy,"unit-3; exam"\r\nQ2,"A,2",,,unit-3\r\n',
    ).expect(200);

    const exported = await request(server())
      .get(`${API_PREFIX}/decks/${deckId}/export`)
      .set(auth())
      .expect(200);

    expect(exported.headers['content-type']).toContain('text/csv');
    expect(exported.headers['content-disposition']).toContain(
      'attachment; filename="biology-unit-3.csv"',
    );
    expect(exported.text).toContain('front,back,hint,difficulty,tags');
    expect(exported.text).toContain('"A,2"');

    const copy = await request(server())
      .post(`${API_PREFIX}/decks`)
      .set(auth())
      .send({ title: 'Copy' })
      .expect(201);
    const copyDeckId = (copy.body as { id: string }).id;

    const reimported = await request(server())
      .post(`${API_PREFIX}/decks/${copyDeckId}/import`)
      .set(auth())
      .attach('file', Buffer.from(exported.text, 'utf8'), {
        filename: 'roundtrip.csv',
        contentType: 'text/csv',
      })
      .expect(200);

    expect(reimported.body).toMatchObject({ imported: 2, skipped: 0 });
  });

  it('rejects a CSV without the required columns', async () => {
    const response = await uploadCsv('question,answer\r\nQ1,A1\r\n').expect(422);

    expect(response.body).toMatchObject({ status: 422 });
  });

  it('rejects an oversized upload with 413', async () => {
    const big = `front,back\r\n${'x,y\r\n'.repeat(250_000)}`;

    await uploadCsv(big, 'big.csv').expect(413);
  });

  it('isolates imports between students', async () => {
    await request(server())
      .post(`${API_PREFIX}/decks/${deckId}/import`)
      .set(auth(otherToken))
      .attach('file', Buffer.from('front,back\r\nQ1,A1\r\n', 'utf8'), {
        filename: 'cards.csv',
        contentType: 'text/csv',
      })
      .expect(404);

    await request(server())
      .get(`${API_PREFIX}/decks/${deckId}/export`)
      .set(auth(otherToken))
      .expect(404);
  });
});
