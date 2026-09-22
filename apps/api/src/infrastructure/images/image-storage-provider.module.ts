import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ImageStoragePort } from '../../domain/ports/image-storage.port.js';
import { CloudinaryImageStorage } from './cloudinary-image-storage.adapter.js';
import { DisabledImageStorage } from './disabled-image-storage.js';

@Global()
@Module({
  providers: [
    {
      provide: ImageStoragePort,
      inject: [ConfigService],
      useFactory: (config: ConfigService): ImageStoragePort =>
        (config.get<string>('IMAGE_STORAGE') ?? 'disabled') === 'cloudinary'
          ? new CloudinaryImageStorage(config)
          : new DisabledImageStorage(),
    },
  ],
  exports: [ImageStoragePort],
})
export class ImageStorageProviderModule {}
