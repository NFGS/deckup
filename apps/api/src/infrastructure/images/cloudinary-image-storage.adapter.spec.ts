import { describe, expect, it } from 'vitest';

import { resolveCloudinaryCredentials } from './cloudinary-image-storage.adapter.js';
import type { ConfigReader } from './cloudinary-image-storage.adapter.js';

function config(values: Record<string, string>): ConfigReader {
  return { get: (key: string) => values[key] };
}

describe('resolveCloudinaryCredentials', () => {
  it('reads the individual variables', () => {
    const credentials = resolveCloudinaryCredentials(
      config({
        CLOUDINARY_CLOUD_NAME: 'deckup',
        CLOUDINARY_API_KEY: '123456789',
        CLOUDINARY_API_SECRET: 'super-secret',
      }),
    );

    expect(credentials).toEqual({
      cloudName: 'deckup',
      apiKey: '123456789',
      apiSecret: 'super-secret',
    });
  });

  it('parses CLOUDINARY_URL as a fallback', () => {
    const credentials = resolveCloudinaryCredentials(
      config({ CLOUDINARY_URL: 'cloudinary://123456789:super-secret@deckup' }),
    );

    expect(credentials).toEqual({
      cloudName: 'deckup',
      apiKey: '123456789',
      apiSecret: 'super-secret',
    });
  });

  it('decodes URL-encoded credentials', () => {
    const credentials = resolveCloudinaryCredentials(
      config({ CLOUDINARY_URL: 'cloudinary://key%40user:pa%3Ass@deckup' }),
    );

    expect(credentials).toEqual({
      cloudName: 'deckup',
      apiKey: 'key@user',
      apiSecret: 'pa:ss',
    });
  });

  it('prefers the individual variables over CLOUDINARY_URL', () => {
    const credentials = resolveCloudinaryCredentials(
      config({
        CLOUDINARY_URL: 'cloudinary://url-key:url-secret@url-cloud',
        CLOUDINARY_CLOUD_NAME: 'deckup',
        CLOUDINARY_API_KEY: '123456789',
        CLOUDINARY_API_SECRET: 'super-secret',
      }),
    );

    expect(credentials?.cloudName).toBe('deckup');
  });

  it('returns null for malformed or incomplete configuration', () => {
    expect(resolveCloudinaryCredentials(config({}))).toBeNull();
    expect(resolveCloudinaryCredentials(config({ CLOUDINARY_URL: 'not-a-url' }))).toBeNull();
    expect(
      resolveCloudinaryCredentials(config({ CLOUDINARY_URL: 'cloudinary://key@deckup' })),
    ).toBeNull();
    expect(resolveCloudinaryCredentials(config({ CLOUDINARY_CLOUD_NAME: 'deckup' }))).toBeNull();
  });
});
