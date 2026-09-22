import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';

export const MAX_UPLOAD_BYTES = 1_048_576;

/**
 * Registers the Fastify plugins shared by the real bootstrap and the test
 * application, so integration tests exercise the production wiring.
 */
export async function registerPlugins(app: NestFastifyApplication): Promise<void> {
  await app.register(fastifyCookie);
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(multipart, { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } });
}
