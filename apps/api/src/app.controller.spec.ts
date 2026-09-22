import { Test, type TestingModule } from '@nestjs/testing';
import { healthResponseSchema } from '@deckup/shared';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('returns a schema-compliant health payload', () => {
      const health = appController.getHealth();

      expect(healthResponseSchema.parse(health)).toEqual(health);
      expect(health.service).toBe('deckup-api');
      expect(health.status).toBe('ok');
    });
  });
});
