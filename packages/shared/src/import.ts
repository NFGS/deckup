import { z } from 'zod';

/** Maximum accepted size for a CSV import (also the default multipart limit). */
export const IMPORT_MAX_BYTES = 1_048_576;

export const importRowErrorSchema = z.object({
  row: z.number().int().positive(),
  message: z.string(),
});

export type ImportRowError = z.infer<typeof importRowErrorSchema>;

export const importSummarySchema = z.object({
  imported: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  errors: z.array(importRowErrorSchema),
  /** Rows whose front repeats an earlier row; they are imported and flagged (E1). */
  duplicateRows: z.array(z.number().int().positive()).default([]),
  /** Human-readable note, for example a header-only file (E2). */
  notice: z.string().optional(),
});

export type ImportSummary = z.infer<typeof importSummarySchema>;
