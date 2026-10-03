import { FastifyAdapter } from '@nestjs/platform-fastify';
import { LogController } from 'fastify';

export interface FastifyAdapterOptions {
  logger?: boolean | { level: string };
  trustProxy?: boolean | number;
}

/**
 * Fastify adapter shared by the real bootstrap and the test application, so
 * integration tests exercise the production wiring (request ids included).
 *
 * `trustProxy` defaults to `false`: trusting `X-Forwarded-For` from any client
 * would let an attacker rotate the header and bypass the rate limiter. Behind
 * a reverse proxy set `TRUST_PROXY` to the number of trusted hops.
 */
export function createFastifyAdapter(options: FastifyAdapterOptions = {}): FastifyAdapter {
  const { trustProxy = false, ...rest } = options;
  const trustProxyOption =
    typeof trustProxy === 'number'
      ? (_address: string, hop: number) => hop < trustProxy
      : trustProxy;

  return new FastifyAdapter({
    trustProxy: trustProxyOption,
    requestIdHeader: 'x-request-id',
    logController: new LogController({ requestIdLogLabel: 'requestId' }),
    ...rest,
  });
}
