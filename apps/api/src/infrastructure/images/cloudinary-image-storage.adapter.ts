import { createHash } from 'node:crypto';

import type { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import { ServiceUnavailableError } from '../../domain/errors/domain-errors.js';
import { ImageStoragePort } from '../../domain/ports/image-storage.port.js';
import type { ImageUploadInput, StoredImage } from '../../domain/ports/image-storage.port.js';

const REQUEST_TIMEOUT_MS = 15_000;
const DELIVERY_TYPE = 'authenticated';

const uploadResponseSchema = z.object({
  secure_url: z.url(),
  public_id: z.string().min(1),
});

const destroyResponseSchema = z.object({ result: z.string() });

interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface ConfigReader {
  get(key: string): unknown;
}

function readString(config: ConfigReader, key: string): string | undefined {
  const value = config.get(key);

  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Resolves Cloudinary credentials from the individual variables or from the
 * `CLOUDINARY_URL` format (`cloudinary://api_key:api_secret@cloud_name`).
 */
export function resolveCloudinaryCredentials(config: ConfigReader): CloudinaryCredentials | null {
  const cloudName = readString(config, 'CLOUDINARY_CLOUD_NAME');
  const apiKey = readString(config, 'CLOUDINARY_API_KEY');
  const apiSecret = readString(config, 'CLOUDINARY_API_SECRET');

  if (cloudName && apiKey && apiSecret) {
    return { cloudName, apiKey, apiSecret };
  }

  const url = readString(config, 'CLOUDINARY_URL');

  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);

    if (
      parsed.protocol !== 'cloudinary:' ||
      !parsed.hostname ||
      !parsed.username ||
      !parsed.password
    ) {
      return null;
    }

    return {
      cloudName: parsed.hostname,
      apiKey: decodeURIComponent(parsed.username),
      apiSecret: decodeURIComponent(parsed.password),
    };
  } catch {
    return null;
  }
}

/**
 * Cloudinary adapter (RF-05, NFR-03.3): signed upload and destroy calls over
 * the REST API, so no provider SDK is required.
 *
 * Assets are uploaded as `authenticated` and the stored URL is signed, so a
 * card image is only reachable through its owner's signed delivery URL.
 */
export class CloudinaryImageStorage extends ImageStoragePort {
  private readonly credentials: CloudinaryCredentials | null;
  private readonly folder: string;

  constructor(config: ConfigService) {
    super();
    this.credentials = resolveCloudinaryCredentials(config);
    this.folder = config.get<string>('CLOUDINARY_FOLDER') ?? 'deckup/cards';
  }

  get isEnabled(): boolean {
    return this.credentials !== null;
  }

  async upload(input: ImageUploadInput): Promise<StoredImage> {
    const credentials = this.requireCredentials();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = sign(
      { folder: this.folder, sign_url: 'true', timestamp, type: DELIVERY_TYPE },
      credentials.apiSecret,
    );

    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(input.buffer)], { type: input.mimeType }),
      input.filename,
    );
    form.append('api_key', credentials.apiKey);
    form.append('timestamp', timestamp);
    form.append('folder', this.folder);
    form.append('type', DELIVERY_TYPE);
    form.append('sign_url', 'true');
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
    const credentials = this.requireCredentials();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = sign(
      { public_id: publicId, timestamp, type: DELIVERY_TYPE },
      credentials.apiSecret,
    );

    const body = new URLSearchParams({
      public_id: publicId,
      timestamp,
      type: DELIVERY_TYPE,
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

  private requireCredentials(): CloudinaryCredentials {
    if (!this.credentials) {
      throw new ServiceUnavailableError('Card image storage is not configured');
    }

    return this.credentials;
  }

  private async request(path: string, init: RequestInit): Promise<unknown> {
    const { cloudName } = this.requireCredentials();
    let response: Response;

    try {
      response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}${path}`, {
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
