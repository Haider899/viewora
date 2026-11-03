import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform(Number),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().default('file:./dev.db'),
  JWT_ACCESS_SECRET: z.string().default('vistarax_super_secret_access_jwt_key_2026_secure'),
  JWT_REFRESH_SECRET: z.string().default('vistarax_super_secret_refresh_jwt_key_2026_secure'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  ENABLE_REWARDS: z.string().default('true').transform((val) => val === 'true'),
  ENABLE_REFERRAL_COMMISSIONS: z.string().default('true').transform((val) => val === 'true'),
  ENABLE_CRYPTO_PAYMENTS: z.string().default('true').transform((val) => val === 'true'),
  MAINTENANCE_MODE: z.string().default('false').transform((val) => val === 'true'),
  DEFAULT_COMMISSION_PERCENT: z.string().default('5.0').transform(Number),
  DEFAULT_USD_TO_PKR_RATE: z.string().default('280.00').transform(Number),
});

export const env = envSchema.parse(process.env);
