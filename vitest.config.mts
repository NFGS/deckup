import { defineConfig } from 'vitest/config';

/**
 * Unit tests for the repository automation under `scripts/`. The app packages
 * run their own Vitest configs through Turbo; this one covers the build-time
 * helpers (document registry, vault map of content) that live outside a
 * package.
 */
export default defineConfig({
  test: {
    globals: true,
    include: ['scripts/**/*.spec.ts'],
  },
});
