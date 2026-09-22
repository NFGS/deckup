import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@deckup/shared';

import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): HealthResponse {
    return this.appService.getHealth();
  }
}
