import { defineRailway, github, preserve, project, service } from 'railway/iac';

// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = 'deckup-api';

export default defineRailway(() => {
  const api = service('deckup-api', {
    source: github('NFGS/deckup', { branch: 'main' }),
    build: {
      builder: 'DOCKERFILE',
      dockerfilePath: 'apps/api/Dockerfile',
    },
    healthcheck: '/api/v1/health',
    healthcheckTimeout: 120,
    preDeploy: 'node_modules/.bin/prisma migrate deploy',
    env: {
      APP_VERSION: preserve(),
      COOKIE_SECURE: preserve(),
      CORS_ORIGINS: preserve(),
      DATABASE_URL: preserve(),
      IMAGE_STORAGE: preserve(),
      JWT_ACCESS_SECRET: preserve(),
      LLM_PROVIDER: preserve(),
      TRUST_PROXY: preserve(),
    },
  });

  return project('deckup', {
    resources: [api],
  });
});
