import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { HealthResponse } from '@deckup/shared';

const SERVICE_NAME = 'deckup-api';
const DEFAULT_VERSION = '0.1.0';

@Injectable()
export class AppService {
  private readonly startedAt = Date.now();

  constructor(private readonly config: ConfigService) {}

  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: SERVICE_NAME,
      version: this.config.get<string>('APP_VERSION') ?? DEFAULT_VERSION,
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
  }
}
