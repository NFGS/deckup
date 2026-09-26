import { CsvParserPort } from '../../domain/ports/csv-parser.port.js';
import type { CsvRow, ParsedCsv } from '../../domain/ports/csv-parser.port.js';

export class FakeCsvParser extends CsvParserPort {
  columns: string[] = ['front', 'back'];

  rows: CsvRow[] = [];

  error: Error | null = null;

  lastText: string | null = null;

  parse(text: string): ParsedCsv {
    this.lastText = text;

    if (this.error) {
      throw this.error;
    }

    return { columns: this.columns, rows: this.rows };
  }
}
