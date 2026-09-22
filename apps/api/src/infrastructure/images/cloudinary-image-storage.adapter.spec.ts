import { createHash } from 'node:crypto';

import type { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ServiceUnavailableError } from '../../domain/errors/domain-errors.js';
import { CloudinaryImageStorage } from './cloudinary-image-storage.adapter.js';

const NOW = new Date('2026-09-22T12:00:00Z');
const TIMESTAMP = String(Math.floor(NOW.getTime() / 1000));

const config = (values: Record<string, string>): ConfigService =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

function expectedSignature(params: string, secret: string): string {
  return createHash('sha1').update(`${params}${secret}`).digest('hex');
}

describe('CloudinaryImageStorage', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('uploads a signed image and parses the delivery URL', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/card.png',
          public_id: 'deckup/cards/card',
        }),
        { status: 200 },
      ),
    );

    const storage = new CloudinaryImageStorage(
      config({
        CLOUDINARY_CLOUD_NAME: 'demo',
        CLOUDINARY_API_KEY: 'api-key',
        CLOUDINARY_API_SECRET: 'api-secret',
        CLOUDINARY_FOLDER: 'deckup/cards',
      }),
    );

    const result = await storage.upload({
      ownerId: 'user-1',
      cardId: 'card-1',
      buffer: Buffer.from([0xff, 0xd8, 0xff]),
      mimeType: 'image/jpeg',
      filename: 'photo.jpg',
    });

    expect(result).toEqual({
      url: 'https://res.cloudinary.com/demo/image/upload/v1/card.png',
      publicId: 'deckup/cards/card',
    });

    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(call[0]).toBe('https://api.cloudinary.com/v1_1/demo/image/upload');

    const form = call[1].body as FormData;
    expect(form.get('api_key')).toBe('api-key');
    expect(form.get('folder')).toBe('deckup/cards');
    expect(form.get('timestamp')).toBe(TIMESTAMP);
    expect(form.get('signature')).toBe(
      expectedSignature(`folder=deckup/cards&timestamp=${TIMESTAMP}`, 'api-secret'),
    );
  });

  it('destroys a signed asset', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ result: 'ok' }), { status: 200 }));

    const storage = new CloudinaryImageStorage(
      config({
        CLOUDINARY_CLOUD_NAME: 'demo',
        CLOUDINARY_API_KEY: 'api-key',
        CLOUDINARY_API_SECRET: 'api-secret',
      }),
    );

    await storage.remove('deckup/cards/card');

    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(call[0]).toBe('https://api.cloudinary.com/v1_1/demo/image/destroy');

    const body = call[1].body as URLSearchParams;
    expect(body.get('public_id')).toBe('deckup/cards/card');
    expect(body.get('signature')).toBe(
      expectedSignature(`public_id=deckup/cards/card&timestamp=${TIMESTAMP}`, 'api-secret'),
    );
  });

  it('treats a missing asset as removed', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ result: 'not found' }), { status: 200 }),
    );

    const storage = new CloudinaryImageStorage(
      config({
        CLOUDINARY_CLOUD_NAME: 'demo',
        CLOUDINARY_API_KEY: 'api-key',
        CLOUDINARY_API_SECRET: 'api-secret',
      }),
    );

    await expect(storage.remove('deckup/cards/missing')).resolves.toBeUndefined();
  });

  it('fails with a service error when credentials are missing', async () => {
    const storage = new CloudinaryImageStorage(config({ CLOUDINARY_CLOUD_NAME: 'demo' }));

    expect(storage.isEnabled).toBe(false);
    await expect(
      storage.upload({
        ownerId: 'user-1',
        cardId: 'card-1',
        buffer: Buffer.from([0xff, 0xd8, 0xff]),
        mimeType: 'image/jpeg',
        filename: 'photo.jpg',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it('maps provider failures to a service error', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 400 }));

    const storage = new CloudinaryImageStorage(
      config({
        CLOUDINARY_CLOUD_NAME: 'demo',
        CLOUDINARY_API_KEY: 'api-key',
        CLOUDINARY_API_SECRET: 'api-secret',
      }),
    );

    await expect(storage.remove('deckup/cards/card')).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
  });
});
