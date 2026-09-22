import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { APP_ENV, loadEnv } from './env.validation.js';

@Global()
@Module({
  providers: [
    {
      provide: APP_ENV,
      inject: [ConfigService],
      useFactory: loadEnv,
    },
  ],
  exports: [APP_ENV],
})
export class AppConfigModule {}
