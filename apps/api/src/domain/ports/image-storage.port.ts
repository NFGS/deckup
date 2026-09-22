export interface ImageUploadInput {
  ownerId: string;
  cardId: string;
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

export interface StoredImage {
  url: string;
  publicId: string;
}

/**
 * Card image storage (RF-05).
 *
 * Implemented in infrastructure with a provider adapter (Cloudinary); the
 * domain only knows about uploading and removing an asset.
 */
export abstract class ImageStoragePort {
  /** Whether a storage provider is configured for this deployment. */
  abstract readonly isEnabled: boolean;

  abstract upload(input: ImageUploadInput): Promise<StoredImage>;

  /** Removes an asset; must be safe to call when the asset no longer exists. */
  abstract remove(publicId: string): Promise<void>;
}
