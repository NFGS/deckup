import { execSync } from 'node:child_process';

import { Client } from 'pg';

import { TEST_DATABASE_URL } from './utils/test-database.js';

export default async function globalSetup(): Promise<void> {
  await ensureDatabaseExists();

  execSync('pnpm exec prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'pipe',
  });
}

async function ensureDatabaseExists(): Promise<void> {
  const databaseUrl = new URL(TEST_DATABASE_URL);
  const databaseName = databaseUrl.pathname.replace(/^\//, '');

  const adminUrl = new URL(TEST_DATABASE_URL);
  adminUrl.pathname = '/postgres';

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();

  try {
    const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      databaseName,
    ]);

    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE "${databaseName}"`);
    }
  } finally {
    await client.end();
  }
}
