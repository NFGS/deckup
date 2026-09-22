import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      // The domain layer is unit-tested in isolation; application use cases are
      // verified by the integration suite (`test:e2e`), which is not part of
      // unit coverage.
      include: ['src/domain/**'],
      thresholds: {
        statements: 80,
        branches: 85,
        functions: 75,
        lines: 80,
      },
    },
  },
});
