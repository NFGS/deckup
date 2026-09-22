import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { DisabledImageStorage } from '../src/infrastructure/images/disabled-image-storage.js';
import { FakeImageStorage } from '../src/testing/fakes/fake-image-storage.fake.js';
import { API_PREFIX, registerAccount } from './utils/auth.js';
import { createTestApp, resetDatabase } from './utils/test-app.js';

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function png(sizeBytes = 32): Buffer {
  const buffer = Buffer.alloc(sizeBytes);
  Buffer.from(PNG_HEADER).copy(buffer);
  return buffer;
}

function jpeg(): Buffer {
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
}

const SECOND_ACCOUNT = {
  email: 'beto@example.com',
  password: 'super-secret-2',
  displayName: 'Beto',
};

interface CardImageBody {
  id: string;
  imageUrl: string | null;
}

describe('Card images (e2e)', () => {
  let app: NestFastifyApplication;
  let storage: FakeImageStorage;
  let token: string;
  let otherToken: string;
  let deckId: string;

  beforeAll(async () => {
    storage = new FakeImageStorage();
    app = await createTestApp({ imageStorage: storage });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    storage.uploads.length = 0;
    storage.removed.length = 0;
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

  async function createCard(): Promise<string> {
    const response = await request(server())
      .post(`${API_PREFIX}/decks/${deckId}/cards`)
      .set(auth(token))
      .send({ front: 'What is mitosis?', back: 'Cell division' })
      .expect(201);

    return (response.body as { id: string }).id;
  }

  function upload(cardId: string, accessToken: string, body: Buffer) {
    return request(server())
      .post(`${API_PREFIX}/cards/${cardId}/image`)
      .set(auth(accessToken))
      .attach('file', body, { filename: 'diagram.png', contentType: 'image/png' });
  }

  it('uploads a PNG and returns the delivery URL', async () => {
    const cardId = await createCard();

    const response = await upload(cardId, token, png()).expect(201);
    const body = response.body as CardImageBody;

    expect(body.imageUrl).toContain('https://cdn.test/');
    expect(storage.uploads).toHaveLength(1);
    expect(storage.uploads[0]?.mimeType).toBe('image/png');

    const detail = await request(server())
      .get(`${API_PREFIX}/cards/${cardId}`)
      .set(auth(token))
      .expect(200);

    expect((detail.body as CardImageBody).imageUrl).toBe(body.imageUrl);
  });

  it('accepts a JPEG and uses the detected type', async () => {
    const cardId = await createCard();

    await upload(cardId, token, jpeg()).expect(201);

    expect(storage.uploads[0]?.mimeType).toBe('image/jpeg');
  });

  it('allows images above the CSV limit but below 5 MB', async () => {
    const cardId = await createCard();

    await upload(cardId, token, png(2 * 1024 * 1024)).expect(201);
  });

  it('rejects files above 5 MB with 413', async () => {
    const cardId = await createCard();

    await upload(cardId, token, png(5 * 1024 * 1024 + 1)).expect(413);
  });

  it('rejects files that are not images with 422', async () => {
    const cardId = await createCard();

    await upload(cardId, token, Buffer.from('not an image')).expect(422);
  });

  it('replaces the previous asset', async () => {
    const cardId = await createCard();

    const first = await upload(cardId, token, png()).expect(201);
    const firstPublicId = (first.body as { imageUrl: string }).imageUrl;
    expect(firstPublicId).toBeTruthy();

    await upload(cardId, token, jpeg()).expect(201);

    expect(storage.removed).toHaveLength(1);
    expect(storage.uploads).toHaveLength(2);
  });

  it('removes the image and clears the reference', async () => {
    const cardId = await createCard();
    await upload(cardId, token, png()).expect(201);

    const response = await request(server())
      .delete(`${API_PREFIX}/cards/${cardId}/image`)
      .set(auth(token))
      .expect(200);

    expect((response.body as CardImageBody).imageUrl).toBeNull();
    expect(storage.removed).toHaveLength(1);
  });

  it('isolates images between students', async () => {
    const cardId = await createCard();

    await upload(cardId, otherToken, png()).expect(404);

    await request(server())
      .delete(`${API_PREFIX}/cards/${cardId}/image`)
      .set(auth(otherToken))
      .expect(404);
  });

  it('answers 503 when no image storage is configured', async () => {
    const disabledApp = await createTestApp({ imageStorage: new DisabledImageStorage() });

    try {
      const disabledToken = await registerAccount(disabledApp, {
        email: 'carla@example.com',
        password: 'super-secret-3',
        displayName: 'Carla',
      });

      const deck = await request(disabledApp.getHttpServer())
        .post(`${API_PREFIX}/decks`)
        .set(auth(disabledToken))
        .send({ title: 'No storage' })
        .expect(201);

      const card = await request(disabledApp.getHttpServer())
        .post(`${API_PREFIX}/decks/${(deck.body as { id: string }).id}/cards`)
        .set(auth(disabledToken))
        .send({ front: 'Q', back: 'A' })
        .expect(201);

      await request(disabledApp.getHttpServer())
        .post(`${API_PREFIX}/cards/${(card.body as { id: string }).id}/image`)
        .set(auth(disabledToken))
        .attach('file', png(), { filename: 'diagram.png', contentType: 'image/png' })
        .expect(503);
    } finally {
      await disabledApp.close();
    }
  });
});
