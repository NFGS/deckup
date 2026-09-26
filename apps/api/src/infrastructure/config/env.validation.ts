import type { ConfigService } from '@nestjs/config';
import { z } from 'zod';

const EXAMPLE_JWT_SECRET = 'dev-only-access-secret-change-me-0123456789';

const trustProxySchema = z
  .string()
  .default('false')
  .transform((value, ctx) => {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    const hops = Number(value);

    if (Number.isInteger(hops) && hops > 0) {
      return hops;
    }

    ctx.addIssue({
      code: 'custom',
      message: 'TRUST_PROXY must be "true", "false" or a positive integer',
    });

    return z.NEVER;
  });

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    APP_VERSION: z.string().min(1).default('0.1.0'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    TRUST_PROXY: trustProxySchema,
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    TEST_DATABASE_URL: z.string().min(1).optional(),
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
    IMAGE_STORAGE: z.enum(['disabled', 'cloudinary']).default('disabled'),
    CLOUDINARY_URL: z.string().min(1).optional(),
    CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
    CLOUDINARY_API_KEY: z.string().min(1).optional(),
    CLOUDINARY_API_SECRET: z.string().min(1).optional(),
    CLOUDINARY_FOLDER: z.string().min(1).default('deckup/cards'),
    SEED_EMAIL: z.email().optional(),
    SEED_PASSWORD: z.string().min(8).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.LLM_PROVIDER === 'openai' && !env.LLM_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['LLM_API_KEY'],
        message: 'LLM_API_KEY is required when LLM_PROVIDER is openai',
      });
    }

    if (env.IMAGE_STORAGE === 'cloudinary') {
      const hasSeparateCredentials = Boolean(
        env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
      );

      if (!hasSeparateCredentials && !env.CLOUDINARY_URL) {
        for (const key of [
          'CLOUDINARY_CLOUD_NAME',
          'CLOUDINARY_API_KEY',
          'CLOUDINARY_API_SECRET',
        ] as const) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} is required when IMAGE_STORAGE is cloudinary (or set CLOUDINARY_URL)`,
          });
        }
      }
    }

    if (env.NODE_ENV === 'production') {
      if (env.JWT_ACCESS_SECRET === EXAMPLE_JWT_SECRET) {
        ctx.addIssue({
          code: 'custom',
          path: ['JWT_ACCESS_SECRET'],
          message: 'JWT_ACCESS_SECRET must not keep the example value in production',
        });
      }

      if (!env.COOKIE_SECURE) {
        ctx.addIssue({
          code: 'custom',
          path: ['COOKIE_SECURE'],
          message: 'COOKIE_SECURE must be true in production',
        });
      }

      const origins = env.CORS_ORIGINS.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

      if (origins.length === 0 || origins.some((origin) => /localhost|127\.0\.0\.1/.test(origin))) {
        ctx.addIssue({
          code: 'custom',
          path: ['CORS_ORIGINS'],
          message: 'CORS_ORIGINS must list the production web origin(s)',
        });
      }
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

export const APP_ENV = Symbol('APP_ENV');

export function loadEnv(config: ConfigService): AppEnv {
  const parsed = envSchema.safeParse({
    NODE_ENV: config.get<string>('NODE_ENV'),
    PORT: config.get<string>('PORT'),
    APP_VERSION: config.get<string>('APP_VERSION'),
    LOG_LEVEL: config.get<string>('LOG_LEVEL'),
    TRUST_PROXY: config.get<string>('TRUST_PROXY'),
    CORS_ORIGINS: config.get<string>('CORS_ORIGINS'),
    DATABASE_URL: config.get<string>('DATABASE_URL'),
    TEST_DATABASE_URL: config.get<string>('TEST_DATABASE_URL'),
    JWT_ACCESS_SECRET: config.get<string>('JWT_ACCESS_SECRET'),
    JWT_ACCESS_TTL_SECONDS: config.get<string>('JWT_ACCESS_TTL_SECONDS'),
    REFRESH_TOKEN_TTL_DAYS: config.get<string>('REFRESH_TOKEN_TTL_DAYS'),
    COOKIE_SECURE: config.get<string>('COOKIE_SECURE'),
    LLM_PROVIDER: config.get<string>('LLM_PROVIDER'),
    LLM_API_KEY: config.get<string>('LLM_API_KEY'),
    LLM_MODEL: config.get<string>('LLM_MODEL'),
    LLM_BASE_URL: config.get<string>('LLM_BASE_URL'),
    IMAGE_STORAGE: config.get<string>('IMAGE_STORAGE'),
    CLOUDINARY_URL: config.get<string>('CLOUDINARY_URL'),
    CLOUDINARY_CLOUD_NAME: config.get<string>('CLOUDINARY_CLOUD_NAME'),
    CLOUDINARY_API_KEY: config.get<string>('CLOUDINARY_API_KEY'),
    CLOUDINARY_API_SECRET: config.get<string>('CLOUDINARY_API_SECRET'),
    CLOUDINARY_FOLDER: config.get<string>('CLOUDINARY_FOLDER'),
    SEED_EMAIL: config.get<string>('SEED_EMAIL'),
    SEED_PASSWORD: config.get<string>('SEED_PASSWORD'),
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration — ${details}`);
  }

  return parsed.data;
}
