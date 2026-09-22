import { createHash } from 'node:crypto';

import type { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import { ServiceUnavailableError } from '../../domain/errors/domain-errors.js';
import { ImageStoragePort } from '../../domain/ports/image-storage.port.js';
import type { ImageUploadInput, StoredImage } from '../../domain/ports/image-storage.port.js';

const REQUEST_TIMEOUT_MS = 15_000;

const uploadResponseSchema = z.object({
  secure_url: z.url(),
  public_id: z.string().min(1),
});

const destroyResponseSchema = z.object({ result: z.string() });

/**
 * Cloudinary adapter (RF-05, NFR-03.3): signed upload and destroy calls over
 * the REST API, so no provider SDK is required.
 */
export class CloudinaryImageStorage extends ImageStoragePort {
  private readonly cloudName: string | undefined;
  private readonly apiKey: string | undefined;
  private readonly apiSecret: string | undefined;
  private readonly folder: string;

  constructor(config: ConfigService) {
    super();
    this.cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME');
    this.apiKey = config.get<string>('CLOUDINARY_API_KEY');
    this.apiSecret = config.get<string>('CLOUDINARY_API_SECRET');
    this.folder = config.get<string>('CLOUDINARY_FOLDER') ?? 'deckup/cards';
  }

  get isEnabled(): boolean {
    return Boolean(this.cloudName && this.apiKey && this.apiSecret);
  }

  async upload(input: ImageUploadInput): Promise<StoredImage> {
    const credentials = this.credentials();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = sign({ folder: this.folder, timestamp }, credentials.apiSecret);

    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(input.buffer)], { type: input.mimeType }),
      input.filename,
    );
    form.append('api_key', credentials.apiKey);
    form.append('timestamp', timestamp);
    form.append('folder', this.folder);
    form.append('signature', signature);

    const payload = await this.request('/image/upload', { method: 'POST', body: form });
    const parsed = uploadResponseSchema.safeParse(payload);

    if (!parsed.success) {
      throw new ServiceUnavailableError(
        'The image storage provider returned an unexpected payload',
      );
    }

    return { url: parsed.data.secure_url, publicId: parsed.data.public_id };
  }

  async remove(publicId: string): Promise<void> {
    const credentials = this.credentials();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = sign({ public_id: publicId, timestamp }, credentials.apiSecret);

    const body = new URLSearchParams({
      public_id: publicId,
      timestamp,
      api_key: credentials.apiKey,
      signature,
    });

    const payload = await this.request('/image/destroy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!destroyResponseSchema.safeParse(payload).success) {
      throw new ServiceUnavailableError(
        'The image storage provider returned an unexpected payload',
      );
    }
  }

  private credentials(): { apiKey: string; apiSecret: string } {
    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      throw new ServiceUnavailableError('Card image storage is not configured');
    }

    return { apiKey: this.apiKey, apiSecret: this.apiSecret };
  }

  private async request(path: string, init: RequestInit): Promise<unknown> {
    let response: Response;

    try {
      response = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}${path}`, {
        ...init,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ServiceUnavailableError('The image storage provider could not be reached');
    }

    if (!response.ok) {
      throw new ServiceUnavailableError(
        `The image storage provider rejected the request (${response.status})`,
      );
    }

    try {
      return await response.json();
    } catch {
      throw new ServiceUnavailableError('The image storage provider returned malformed JSON');
    }
  }
}

function sign(params: Record<string, string>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return createHash('sha1').update(`${toSign}${apiSecret}`).digest('hex');
}
