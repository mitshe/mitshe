import * as Joi from 'joi';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const authMode = process.env.AUTH_MODE || 'selfhosted';
const isClerkMode = authMode === 'clerk';

/**
 * Auto-generate and persist a secret if not provided.
 * Saves to ~/.mitshe/secrets/{name} so it survives restarts.
 */
function getOrGenerateSecret(envVar: string, name: string): string {
  const fromEnv = process.env[envVar];
  if (fromEnv && fromEnv.length >= 32) return fromEnv;

  const secretsDir = path.join(
    process.env.HOME || '/tmp',
    '.mitshe',
    'secrets',
  );
  const secretFile = path.join(secretsDir, name);

  // Read existing persisted secret
  try {
    const existing = fs.readFileSync(secretFile, 'utf-8').trim();
    if (existing.length >= 32) {
      process.env[envVar] = existing;
      return existing;
    }
  } catch {
    // File doesn't exist yet
  }

  // Generate and persist
  const generated = crypto.randomBytes(32).toString('hex');
  try {
    fs.mkdirSync(secretsDir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(secretFile, generated, { mode: 0o600 });
  } catch (err) {
    console.warn(`[mitshe] Could not persist ${name}: ${(err as Error).message}`);
  }

  process.env[envVar] = generated;
  return generated;
}

// Auto-generate secrets if not set
if (!isClerkMode && !process.env.JWT_SECRET) {
  getOrGenerateSecret('JWT_SECRET', 'jwt-secret');
}
if (!process.env.ENCRYPTION_KEY) {
  getOrGenerateSecret('ENCRYPTION_KEY', 'encryption-key');
}

/**
 * Environment configuration schema with validation
 */
export const configValidationSchema = Joi.object({
  AUTH_MODE: Joi.string()
    .valid('selfhosted', 'clerk')
    .default('selfhosted')
    .description('Authentication mode: selfhosted (email/password) or clerk'),

  DATABASE_URL: Joi.string()
    .required()
    .description('Database connection string (PostgreSQL or SQLite file:)'),

  ENCRYPTION_KEY: Joi.string()
    .length(64)
    .pattern(/^[0-9a-f]+$/i)
    .optional()
    .description(
      'AES-256 encryption key (64 hex chars / 32 bytes). Auto-generated if not set.',
    ),

  JWT_SECRET: Joi.string()
    .min(32)
    .optional()
    .description(
      'JWT secret for signing tokens (min 32 chars). Auto-generated if not set.',
    ),

  CLERK_SECRET_KEY: isClerkMode
    ? Joi.string()
        .pattern(/^sk_(test_|live_)/)
        .required()
        .description('Clerk secret key')
    : Joi.string()
        .optional()
        .description('Clerk secret key (not required in selfhosted mode)'),

  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().port().default(3001),

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .optional(),

  CORS_ORIGINS: Joi.string().default(
    'http://localhost:3000,http://127.0.0.1:3000',
  ),

  ALLOWED_ORIGINS: Joi.string().default(
    'http://localhost:3000,http://127.0.0.1:3000',
  ),

  API_BASE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .default('http://localhost:3001'),

  SENTRY_ENABLED: Joi.string().valid('true', 'false').default('false'),
  SENTRY_DSN: Joi.string().uri().optional(),

  LOG_LEVEL: Joi.string()
    .valid('debug', 'info', 'warn', 'error')
    .default('info'),
});

export interface AppConfig {
  database: { url: string };
  security: { encryptionKey?: string };
  auth: {
    mode: 'selfhosted' | 'clerk';
    clerkSecretKey?: string;
  };
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  redis: { host: string; port: number; url?: string };
  corsOrigins: string[];
  allowedOrigins: string[];
  apiBaseUrl: string;
  sentry?: { dsn: string };
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export const configuration = (): AppConfig => ({
  database: { url: process.env.DATABASE_URL! },
  security: { encryptionKey: process.env.ENCRYPTION_KEY },
  auth: {
    mode: (process.env.AUTH_MODE as 'selfhosted' | 'clerk') || 'selfhosted',
    clerkSecretKey: process.env.CLERK_SECRET_KEY,
  },
  nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  corsOrigins: (
    process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000'
  ).split(','),
  allowedOrigins: (
    process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000'
  ).split(','),
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
  sentry: process.env.SENTRY_DSN ? { dsn: process.env.SENTRY_DSN } : undefined,
  logLevel: (process.env.LOG_LEVEL as AppConfig['logLevel']) || 'info',
});
