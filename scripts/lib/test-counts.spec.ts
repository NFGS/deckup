import { describe, expect, it } from 'vitest';
import {
  parsePlaywrightTotal,
  parseVitestCounts,
  parseVitestTotal,
  stripAnsi,
} from './test-counts.ts';

// A realistic `pnpm test` tail: Turbo prefixes the package lines and the root
// Vitest run has no prefix.
const TURBO_OUTPUT = [
  '@deckup/shared:test: \u001b[2m      Tests \u001b[22m \u001b[1m\u001b[32m8 passed\u001b[39m\u001b[22m\u001b[90m (8)',
  '@deckup/api:test: \u001b[2m      Tests \u001b[22m \u001b[1m\u001b[32m120 passed\u001b[39m\u001b[22m\u001b[90m (120)',
  '@deckup/web:test: \u001b[2m      Tests \u001b[22m \u001b[1m\u001b[32m46 passed\u001b[39m\u001b[22m\u001b[90m (46)',
  '      Tests  24 passed (24)',
].join('\n');

describe('stripAnsi', () => {
  it('removes colour escapes', () => {
    expect(stripAnsi('\u001b[32mgreen\u001b[39m')).toBe('green');
  });

  it('leaves plain text untouched', () => {
    expect(stripAnsi('plain')).toBe('plain');
  });
});

describe('parseVitestCounts', () => {
  it('sums the packages and the scripts run', () => {
    expect(parseVitestCounts(TURBO_OUTPUT)).toEqual({
      total: 198,
      breakdown: 'shared 8 · API 120 · web 46 · scripts 24',
    });
  });

  it('returns zero when nothing reported', () => {
    expect(parseVitestCounts('no tests here')).toEqual({ total: 0, breakdown: '' });
  });

  it('keeps the documented order even when the output is shuffled', () => {
    const shuffled = [
      '@deckup/web:test: Tests  46 passed (46)',
      '@deckup/shared:test: Tests  8 passed (8)',
    ].join('\n');

    expect(parseVitestCounts(shuffled).breakdown).toBe('shared 8 · web 46');
  });
});

describe('parseVitestTotal', () => {
  it('reads a single package run', () => {
    expect(parseVitestTotal('      Tests  72 passed (72)')).toBe(72);
  });

  it('takes the last summary when several appear', () => {
    expect(parseVitestTotal('Tests  1 passed (1)\nTests  72 passed (72)')).toBe(72);
  });

  it('returns null when there is no summary', () => {
    expect(parseVitestTotal('no summary')).toBeNull();
  });
});

describe('parsePlaywrightTotal', () => {
  it('reads the list reporter summary', () => {
    expect(parsePlaywrightTotal('  8 passed (12.3s)')).toBe(8);
  });

  it('ignores other lines', () => {
    expect(parsePlaywrightTotal('Running 8 tests using 4 workers\n  8 passed (12.3s)')).toBe(8);
  });

  it('returns null when there is no summary', () => {
    expect(parsePlaywrightTotal('no summary')).toBeNull();
  });
});
