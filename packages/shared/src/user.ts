import { z } from 'zod';

import { hasAtLeastOneKey, isValidTimeZone } from './utils.js';

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string().min(1).max(80),
  timezone: z.string().min(1).max(64),
  createdAt: z.iso.datetime(),
});

export type User = z.infer<typeof userSchema>;

export const updateUserSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80).optional(),
    timezone: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .refine(isValidTimeZone, { message: 'Use a valid IANA timezone like America/Bogota' })
      .optional(),
  })
  .refine(hasAtLeastOneKey, { message: 'At least one field must be provided' });

export type UpdateUser = z.infer<typeof updateUserSchema>;
