import { describe, expect, it } from 'vitest';

import { CsvWriterAdapter } from './csv-writer.adapter.js';

describe('CsvWriterAdapter', () => {
  const writer = new CsvWriterAdapter();

  it('joins rows with CRLF and escapes quotes and commas', () => {
    const csv = writer.write([
      ['front', 'back'],
      ['Say "hi", please', 'Line one\nLine two'],
    ]);

    expect(csv).toBe('front,back\r\n"Say ""hi"", please","Line one\nLine two"\r\n');
  });

  it('neutralizes spreadsheet formula injection', () => {
    const csv = writer.write([
      ['=SUM(A1:A2)', '+1+1', '-2+3', '@cmd', '\tpayload'],
      ['safe', 'safe', 'safe', 'safe', 'safe'],
    ]);

    expect(csv).toBe("'=SUM(A1:A2),'+1+1,'-2+3,'@cmd,'\tpayload\r\nsafe,safe,safe,safe,safe\r\n");
  });
});
