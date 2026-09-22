export interface CsvRow {
  /** 1-based row number in the source file (header is row 1). */
  row: number;
  values: Record<string, string>;
}

export interface ParsedCsv {
  columns: string[];
  rows: CsvRow[];
}

/**
 * Parses a CSV document into header-mapped rows.
 *
 * Implementations must tolerate a UTF-8 BOM, CRLF line endings and quoted
 * fields, and must reject documents that are not valid CSV.
 */
export abstract class CsvParserPort {
  abstract parse(text: string): ParsedCsv;
}
