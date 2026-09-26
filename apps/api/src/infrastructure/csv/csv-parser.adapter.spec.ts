import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../domain/errors/domain-errors.js';
import { CsvParserAdapter } from './csv-parser.adapter.js';

describe('CsvParserAdapter', () => {
  const parser = new CsvParserAdapter();

  it('parses headers and rows with their line numbers', () => {
    const parsed = parser.parse('front,back\nQ1,A1\nQ2,A2\n');

    expect(parsed.columns).toEqual(['front', 'back']);
    expect(parsed.rows).toEqual([
      { row: 2, values: { front: 'Q1', back: 'A1' } },
      { row: 3, values: { front: 'Q2', back: 'A2' } },
    ]);
  });

  it('strips a UTF-8 BOM and handles CRLF line endings', () => {
    const parsed = parser.parse('\uFEFFfront,back\r\nQ1,A1\r\n');

    expect(parsed.columns).toEqual(['front', 'back']);
    expect(parsed.rows).toEqual([{ row: 2, values: { front: 'Q1', back: 'A1' } }]);
  });

  it('normalizes header names', () => {
    const parsed = parser.parse(' Front , BACK \nQ1,A1\n');

    expect(parsed.columns).toEqual(['front', 'back']);
  });

  it('keeps quoted values containing commas', () => {
    const parsed = parser.parse('front,back\n"Say, hi","Line one"\n');

    expect(parsed.rows[0]?.values.front).toBe('Say, hi');
  });

  it('fills missing columns with empty strings', () => {
    const parsed = parser.parse('front,back,hint\nQ1,A1\n');

    expect(parsed.rows[0]?.values.hint).toBe('');
  });

  it('rejects a document without a header row', () => {
    expect(() => parser.parse('')).toThrow(ValidationError);
    expect(() => parser.parse('\n\n')).toThrow(ValidationError);
  });

  it('rejects a malformed CSV document', () => {
    expect(() => parser.parse('front,back\n"unclosed,A1\n')).toThrow(ValidationError);
  });
});
