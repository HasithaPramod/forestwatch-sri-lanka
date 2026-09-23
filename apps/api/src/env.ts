import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv({ path: path.resolve(process.cwd(), '.env') });
loadEnv({ path: path.resolve(process.cwd(), '../../.env') });

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().positive().default(3001),
    API_PREFIX: z.string().default('/api/v1'),
    WEB_ORIGIN: z.string().default('http://localhost:3000'),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(8),
    JWT_REFRESH_SECRET: z.string().min(8),
    STORAGE_PROVIDER: z.enum(['local', 'supabase']).default('local'),
    STORAGE_LOCAL_ROOT: z.string().default('./uploads'),
    STORAGE_PUBLIC_BASE_URL: z.string().default('http://localhost:3001/api/v1/files'),
    SUPABASE_URL: z.string().optional().default(''),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
    SUPABASE_STORAGE_BUCKET: z.string().optional().default(''),
  })
  .superRefine((value, ctx) => {
    const onVercel = process.env.VERCEL === '1';
    if (onVercel && value.STORAGE_PROVIDER === 'local') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['STORAGE_PROVIDER'],
        message:
          'Vercel has no persistent disk. Set STORAGE_PROVIDER=supabase plus SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET from your dashboard. Never invent those values.',
      });
    }

    if (value.STORAGE_PROVIDER === 'supabase') {
      (['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_STORAGE_BUCKET'] as const).forEach((key) => {
        if (!value[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when STORAGE_PROVIDER=supabase`,
          });
        }
      });
    }

    if (value.NODE_ENV === 'production') {
      if (value.JWT_SECRET.includes('change-me') || value.JWT_REFRESH_SECRET.includes('change-me')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message: 'Replace JWT_SECRET and JWT_REFRESH_SECRET before deploying. Do not use the development placeholders.',
        });
      }
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | undefined;

export function getEnv(): AppEnv {
  if (!cached) {
    cached = envSchema.parse(process.env);
  }
  return cached;
}

export function resetEnvCache(): void {
  cached = undefined;
}
