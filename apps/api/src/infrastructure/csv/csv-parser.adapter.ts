import { Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';

import { ValidationError } from '../../domain/errors/domain-errors.js';
import { CsvParserPort } from '../../domain/ports/csv-parser.port.js';
import type { CsvRow, ParsedCsv } from '../../domain/ports/csv-parser.port.js';

const BOM = '\uFEFF';

interface CsvRecord {
  record: Record<string, string>;
  info?: { lines?: number };
}

@Injectable()
export class CsvParserAdapter extends CsvParserPort {
  parse(text: string): ParsedCsv {
    const normalized = text.startsWith(BOM) ? text.slice(1) : text;

    let raw: unknown;

    try {
      raw = parse(normalized, {
        columns: (header: string[]) => header.map((column) => column.trim().toLowerCase()),
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_column_count: true,
        info: true,
      });
    } catch {
      throw new ValidationError('The file is not a valid CSV document', { field: 'file' });
    }

    if (!Array.isArray(raw)) {
      throw new ValidationError('The file is not a valid CSV document', { field: 'file' });
    }

    const records = raw as CsvRecord[];

    if (records.length === 0) {
      throw new ValidationError('The CSV file must contain a header row', { field: 'file' });
    }

    const columns = Object.keys(records[0]?.record ?? {});
    const rows: CsvRow[] = records.map((entry, index) => ({
      row: entry.info?.lines ?? index + 1,
      values: entry.record,
    }));

    return { columns, rows };
  }
}
