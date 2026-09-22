import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CardGeneratorPort } from '../../domain/ports/card-generator.port.js';
import { DisabledCardGenerator } from './disabled-card-generator.js';
import { OpenAiCardGenerator } from './openai-card-generator.js';

@Global()
@Module({
  providers: [
    {
      provide: CardGeneratorPort,
      inject: [ConfigService],
      useFactory: (config: ConfigService): CardGeneratorPort =>
        (config.get<string>('LLM_PROVIDER') ?? 'disabled') === 'openai'
          ? new OpenAiCardGenerator(config)
          : new DisabledCardGenerator(),
    },
  ],
  exports: [CardGeneratorPort],
})
export class AiProviderModule {}
