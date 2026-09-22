import { ImageStoragePort } from '../../domain/ports/image-storage.port.js';
import type { ImageUploadInput, StoredImage } from '../../domain/ports/image-storage.port.js';

export class FakeImageStorage extends ImageStoragePort {
  isEnabled = true;

  readonly uploads: ImageUploadInput[] = [];
  readonly removed: string[] = [];

  upload(input: ImageUploadInput): Promise<StoredImage> {
    this.uploads.push(input);
    const publicId = `fake/${input.cardId}-${this.uploads.length}`;
    return Promise.resolve({ url: `https://cdn.test/${publicId}.png`, publicId });
  }

  remove(publicId: string): Promise<void> {
    this.removed.push(publicId);
    return Promise.resolve();
  }
}
