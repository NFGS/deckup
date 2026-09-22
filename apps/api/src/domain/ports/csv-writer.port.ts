/**
 * Serializes tabular data as CSV (RFC 4180 quoting rules).
 */
export abstract class CsvWriterPort {
  abstract write(rows: string[][]): string;
}
