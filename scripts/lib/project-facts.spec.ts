import { describe, expect, it } from 'vitest';
import {
  applyFacts,
  defaultFacts,
  factsToPlaceholders,
  stripFactMarkers,
  type ProjectFacts,
} from './project-facts.ts';

const facts: ProjectFacts = {
  ...defaultFacts(),
  version: '0.1.0',
  updated: '2026-10-05',
  documents: 25,
  documentsBreakdown: '17 documents + 8 ADRs',
  docsFolder: 23,
  unitTests: 194,
  unitTestsBreakdown: 'shared 8 · API 120 · web 46 · scripts 20',
  apiIntegration: 72,
  browserE2e: 8,
};

describe('applyFacts', () => {
  it('writes the value inside the marked region', () => {
    expect(applyFacts('| Date | <!--f:date-->old<!--/f--> |', facts)).toBe(
      '| Date | <!--f:date-->2026-10-05<!--/f--> |',
    );
  });

  it('is idempotent', () => {
    const once = applyFacts('{{}}<!--f:unit-tests-->1<!--/f-->', facts);
    expect(applyFacts(once, facts)).toBe(once);
  });

  it('updates every occurrence of a key', () => {
    const template = '<!--f:unit-tests-->1<!--/f--> and <!--f:unit-tests-->1<!--/f-->';
    expect(applyFacts(template, facts)).toBe(
      '<!--f:unit-tests-->194<!--/f--> and <!--f:unit-tests-->194<!--/f-->',
    );
  });

  it('leaves unknown keys untouched so a typo is visible', () => {
    expect(applyFacts('<!--f:nope-->x<!--/f-->', facts)).toBe('<!--f:nope-->x<!--/f-->');
  });

  it('ignores text without markers', () => {
    expect(applyFacts('plain text', facts)).toBe('plain text');
  });
});

describe('stripFactMarkers', () => {
  it('keeps the value and drops the comments', () => {
    expect(stripFactMarkers('| Date | <!--f:date-->2026-10-05<!--/f--> |')).toBe(
      '| Date | 2026-10-05 |',
    );
  });

  it('round-trips applyFacts output', () => {
    const resolved = applyFacts('**<!--f:unit-tests-ratio-->1/1<!--/f-->**', facts);
    expect(stripFactMarkers(resolved)).toBe('**194/194**');
  });

  it('is a no-op when there are no markers', () => {
    expect(stripFactMarkers('plain text')).toBe('plain text');
  });
});

describe('factsToPlaceholders', () => {
  const values = factsToPlaceholders(facts);

  it('maps every documented key', () => {
    expect(values.date).toBe('2026-10-05');
    expect(values.documents).toBe('25');
    expect(values['documents-breakdown']).toBe('17 documents + 8 ADRs');
    expect(values['docs-folder']).toBe('23');
    expect(values['unit-tests']).toBe('194');
    expect(values['unit-tests-ratio']).toBe('194/194');
    expect(values['unit-tests-breakdown']).toBe('shared 8 · API 120 · web 46 · scripts 20');
    expect(values['api-integration']).toBe('72');
    expect(values['api-integration-ratio']).toBe('72/72');
    expect(values['browser-e2e']).toBe('8');
    expect(values['browser-e2e-ratio']).toBe('8/8');
  });

  it('resolves a status-like snippet end to end', () => {
    const template =
      'green (<!--f:unit-tests-->0<!--/f--> unit · <!--f:api-integration-->0<!--/f--> API)';
    expect(stripFactMarkers(applyFacts(template, facts))).toBe('green (194 unit · 72 API)');
  });
});
