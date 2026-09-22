import { defineConfig, devices } from '@playwright/test';

const WEB_PORT = process.env.E2E_WEB_PORT ?? '5173';
const API_PORT = process.env.E2E_API_PORT ?? '3000';

const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${WEB_PORT}`;
const apiBaseUrl = process.env.E2E_API_URL ?? `http://localhost:${API_PORT}/api/v1`;
const apiHealthUrl = `${apiBaseUrl}/health`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command:
            'pnpm --filter @deckup/api exec prisma migrate deploy && pnpm --filter @deckup/api start:prod',
          url: apiHealthUrl,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: {
            PORT: API_PORT,
            CORS_ORIGINS: baseURL,
          },
        },
        {
          command: `pnpm --filter @deckup/web preview --port ${WEB_PORT} --strictPort`,
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
});
