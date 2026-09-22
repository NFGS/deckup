export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://deckup:deckup@localhost:5432/deckup_test?schema=public';
