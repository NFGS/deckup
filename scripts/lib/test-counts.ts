/**
 * Parsers for the test runners' console output.
 *
 * Kept pure and unit-tested so the counting rules live in one place instead of
 * inside the refresh script, and so the CI can assert the recorded numbers.
 */

/** Strips the ANSI colours Turbo and Vitest write to a piped stdout. */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

export interface TestCounts {
  /** Total tests across every runner that reported. */
  total: number;
  /** Human breakdown, e.g. `shared 8 · API 120 · web 46 · scripts 24`. */
  breakdown: string;
}

const LABELS: Record<string, string> = { shared: 'shared', api: 'API', web: 'web' };
const ORDER = ['shared', 'API', 'web', 'scripts'];

/**
 * Parses a `pnpm test` (Turbo + Vitest) run: the per-package lines plus the
 * root scripts run, in a stable order.
 */
export function parseVitestCounts(output: string): TestCounts {
  const counts = new Map<string, number>();

  for (const line of stripAnsi(output).split('\n')) {
    const match = /^(?:@deckup\/(\w+):test:\s+)?\s*Tests\s+(\d+)\s+passed/.exec(line);

    if (!match) {
      continue;
    }

    const label = match[1] ? (LABELS[match[1]] ?? match[1]) : 'scripts';
    counts.set(label, (counts.get(label) ?? 0) + Number(match[2]));
  }

  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  const breakdown = ORDER.filter((label) => counts.has(label))
    .map((label) => `${label} ${counts.get(label)}`)
    .join(' · ');

  return { total, breakdown };
}

/** Parses the total of a single Vitest run (`Tests  72 passed (72)`). */
export function parseVitestTotal(output: string): number | null {
  const matches = [...stripAnsi(output).matchAll(/Tests\s+(\d+)\s+passed/g)];
  const last = matches.at(-1);

  return last ? Number(last[1]) : null;
}

/** Parses the total of a Playwright run (`  8 passed (12.3s)`). */
export function parsePlaywrightTotal(output: string): number | null {
  const matches = [...stripAnsi(output).matchAll(/^\s*(\d+)\s+passed\b/gm)];
  const last = matches.at(-1);

  return last ? Number(last[1]) : null;
}
