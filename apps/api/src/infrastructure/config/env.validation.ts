import type { ConfigService } from '@nestjs/config';
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export type AppEnv = z.infer<typeof envSchema>;

export const APP_ENV = Symbol('APP_ENV');

export function loadEnv(config: ConfigService): AppEnv {
  const parsed = envSchema.safeParse({
    NODE_ENV: config.get<string>('NODE_ENV'),
    PORT: config.get<string>('PORT'),
    CORS_ORIGINS: config.get<string>('CORS_ORIGINS'),
    DATABASE_URL: config.get<string>('DATABASE_URL'),
    JWT_ACCESS_SECRET: config.get<string>('JWT_ACCESS_SECRET'),
    JWT_ACCESS_TTL_SECONDS: config.get<string>('JWT_ACCESS_TTL_SECONDS'),
    REFRESH_TOKEN_TTL_DAYS: config.get<string>('REFRESH_TOKEN_TTL_DAYS'),
    COOKIE_SECURE: config.get<string>('COOKIE_SECURE'),
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration — ${details}`);
  }

  return parsed.data;
}
