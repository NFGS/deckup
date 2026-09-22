import { defineConfig } from 'vitest/config';

import { TEST_DATABASE_URL } from './test/utils/test-database.js';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
    },
  },
});
