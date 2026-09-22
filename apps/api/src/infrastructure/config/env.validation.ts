import type { ConfigService } from '@nestjs/config';
import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    APP_VERSION: z.string().min(1).default('0.1.0'),
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    COOKIE_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    LLM_PROVIDER: z.enum(['disabled', 'openai']).default('disabled'),
    LLM_API_KEY: z.string().min(1).optional(),
    LLM_MODEL: z.string().min(1).default('gpt-4o-mini'),
    LLM_BASE_URL: z.url().default('https://api.openai.com/v1'),
  })
  .superRefine((env, ctx) => {
    if (env.LLM_PROVIDER === 'openai' && !env.LLM_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['LLM_API_KEY'],
        message: 'LLM_API_KEY is required when LLM_PROVIDER is openai',
      });
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

export const APP_ENV = Symbol('APP_ENV');

export function loadEnv(config: ConfigService): AppEnv {
  const parsed = envSchema.safeParse({
    NODE_ENV: config.get<string>('NODE_ENV'),
    PORT: config.get<string>('PORT'),
    APP_VERSION: config.get<string>('APP_VERSION'),
    CORS_ORIGINS: config.get<string>('CORS_ORIGINS'),
    DATABASE_URL: config.get<string>('DATABASE_URL'),
    JWT_ACCESS_SECRET: config.get<string>('JWT_ACCESS_SECRET'),
    JWT_ACCESS_TTL_SECONDS: config.get<string>('JWT_ACCESS_TTL_SECONDS'),
    REFRESH_TOKEN_TTL_DAYS: config.get<string>('REFRESH_TOKEN_TTL_DAYS'),
    COOKIE_SECURE: config.get<string>('COOKIE_SECURE'),
    LLM_PROVIDER: config.get<string>('LLM_PROVIDER'),
    LLM_API_KEY: config.get<string>('LLM_API_KEY'),
    LLM_MODEL: config.get<string>('LLM_MODEL'),
    LLM_BASE_URL: config.get<string>('LLM_BASE_URL'),
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration — ${details}`);
  }

  return parsed.data;
}
