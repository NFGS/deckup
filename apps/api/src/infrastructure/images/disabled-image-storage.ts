import { ServiceUnavailableError } from '../../domain/errors/domain-errors.js';
import { ImageStoragePort } from '../../domain/ports/image-storage.port.js';
import type { ImageUploadInput, StoredImage } from '../../domain/ports/image-storage.port.js';

/**
 * Fallback used when no image storage is configured: the endpoint answers 503
 * instead of failing unexpectedly.
 */
export class DisabledImageStorage extends ImageStoragePort {
  readonly isEnabled = false;

  upload(_input: ImageUploadInput): Promise<StoredImage> {
    return Promise.reject(
      new ServiceUnavailableError('Card image storage is not configured on this deployment'),
    );
  }

  remove(_publicId: string): Promise<void> {
    return Promise.reject(
      new ServiceUnavailableError('Card image storage is not configured on this deployment'),
    );
  }
}
