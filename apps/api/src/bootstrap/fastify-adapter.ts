import { FastifyAdapter } from '@nestjs/platform-fastify';

export interface FastifyAdapterOptions {
  logger?: boolean | { level: string };
}

/**
 * Fastify adapter shared by the real bootstrap and the test application, so
 * integration tests exercise the production wiring (request ids included).
 */
export function createFastifyAdapter(options: FastifyAdapterOptions = {}): FastifyAdapter {
  return new FastifyAdapter({
    trustProxy: true,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    ...options,
  });
}
