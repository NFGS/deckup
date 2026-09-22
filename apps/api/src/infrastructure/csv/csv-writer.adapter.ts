import { Injectable } from '@nestjs/common';

import { CsvWriterPort } from '../../domain/ports/csv-writer.port.js';

const LINE_BREAK = '\r\n';
const MUST_QUOTE = /[",\r\n]/;

@Injectable()
export class CsvWriterAdapter extends CsvWriterPort {
  write(rows: string[][]): string {
    return `${rows.map((row) => row.map(escapeField).join(',')).join(LINE_BREAK)}${LINE_BREAK}`;
  }
}

function escapeField(value: string): string {
  if (MUST_QUOTE.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}
