import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import { IMPORT_MAX_BYTES } from '@deckup/shared';

/**
 * Registers the Fastify plugins shared by the real bootstrap and the test
 * application, so integration tests exercise the production wiring.
 */
export async function registerPlugins(app: NestFastifyApplication): Promise<void> {
  await app.register(fastifyCookie);
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(multipart, { limits: { fileSize: IMPORT_MAX_BYTES, files: 1 } });

  const instance = app.getHttpAdapter().getInstance();

  instance.addHook('onRequest', (request, reply, done) => {
    void reply.header('x-request-id', request.id);
    done();
  });

  // Authenticated payloads must never be reused by the browser or an
  // intermediary: without this header Chrome heuristically cached GET /decks
  // and served a stale list after a mutation.
  instance.addHook('onSend', (_request, reply, payload, done) => {
    void reply.header('cache-control', 'no-store');
    done(null, payload);
  });
}
