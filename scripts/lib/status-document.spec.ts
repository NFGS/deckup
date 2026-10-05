import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyFacts,
  defaultFacts,
  factsToPlaceholders,
  readProjectFacts,
  stripFactMarkers,
} from './project-facts.ts';

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..', '..');
const STATUS_PATH = resolve(REPOSITORY_ROOT, 'docs', 'STATUS.md');

/**
 * Regression guard for the automation itself. `docs/STATUS.md` must keep the
 * fact markers — if they are ever replaced by literal values the refresh can no
 * longer update them, which is the bug the markers were introduced to fix.
 */
describe('docs/STATUS.md', () => {
  it('keeps the derived values inside fact markers', async () => {
    const markdown = await readFile(STATUS_PATH, 'utf8');
    const known = new Set(Object.keys(factsToPlaceholders(defaultFacts())));
    const marked = [...markdown.matchAll(/<!--f:([a-z0-9-]+)-->/g)].map((match) => match[1]);

    expect(marked.length).toBeGreaterThan(0);
    expect(marked.filter((key) => !known.has(key))).toEqual([]);
  });

  it('is resolved: the committed facts match the committed document', async () => {
    const markdown = await readFile(STATUS_PATH, 'utf8');
    const facts = await readProjectFacts(REPOSITORY_ROOT);

    expect(applyFacts(markdown, facts)).toBe(markdown);
  });

  it('publishes without markers', async () => {
    const markdown = await readFile(STATUS_PATH, 'utf8');

    expect(stripFactMarkers(markdown)).not.toContain('<!--f:');
  });
});
