import { z } from 'zod';

export const importRowErrorSchema = z.object({
  row: z.number().int().positive(),
  message: z.string(),
});

export type ImportRowError = z.infer<typeof importRowErrorSchema>;

export const importSummarySchema = z.object({
  imported: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  errors: z.array(importRowErrorSchema),
});

export type ImportSummary = z.infer<typeof importSummarySchema>;
