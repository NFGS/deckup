import { z } from 'zod';

import { userSchema } from './user.js';

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(10).max(72),
  displayName: z.string().trim().min(1).max(80),
  timezone: z.string().trim().min(1).max(64).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const authSessionSchema = z.object({
  accessToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
  user: userSchema,
});

export type AuthSession = z.infer<typeof authSessionSchema>;

export const accessTokenPayloadSchema = z.object({
  sub: z.uuid(),
  email: z.email(),
});

export type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;
