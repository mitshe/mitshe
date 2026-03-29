import * as Joi from 'joi';

// Check if we're in local mode (no auth required)
const isLocalMode = process.env.AUTH_MODE === 'local';

/**
 * Environment configuration schema with validation
 * App will fail to start if required variables are missing or invalid
 *
 * In local mode (AUTH_MODE=local):
 * - SQLite database URLs are allowed (file:)
 * - CLERK_SECRET_KEY is not required
 */
export const configValidationSchema = Joi.object({
  // ============================================================================
  // Auth Mode
  // ============================================================================
  AUTH_MODE: Joi.string()
    .valid('local', 'clerk')
    .default('clerk')
    .description('Authentication mode: local (no auth) or clerk'),

  // ============================================================================
  // Required - App will not start without these
  // ============================================================================

  // Database - PostgreSQL required for production, SQLite allowed in local mode
  DATABASE_URL: isLocalMode
    ? Joi.string()
        .required()
        .description('Database connection string (PostgreSQL or SQLite file:)')
    : Joi.string()
        .uri({ scheme: ['postgresql', 'postgres'] })
        .required()
        .description('PostgreSQL connection string'),

  // Security
  ENCRYPTION_KEY: Joi.string()
    .hex()
    .length(64) // 32 bytes = 64 hex characters
    .required()
    .description('AES-256 encryption key (32-byte hex string)'),

  // Auth - Required only in clerk mode
  CLERK_SECRET_KEY: isLocalMode
    ? Joi.string()
        .optional()
        .description('Clerk secret key (not required in local mode)')
    : Joi.string()
        .pattern(/^sk_(test_|live_)/)
        .required()
        .description('Clerk secret key'),

  // ============================================================================
  // Optional with sensible defaults
  // ============================================================================

  // Server
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().port().default(3001),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .optional(),

  // CORS
  CORS_ORIGINS: Joi.string()
    .default('http://localhost:3000,http://127.0.0.1:3000')
    .description('Comma-separated list of allowed origins'),

  ALLOWED_ORIGINS: Joi.string()
    .default('http://localhost:3000,http://127.0.0.1:3000')
    .description('Comma-separated list of allowed WebSocket origins'),

  // API
  API_BASE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .default('http://localhost:3001')
    .description('Public API base URL for OAuth callbacks'),

  // ============================================================================
  // Optional - Features disabled if not set
  // ============================================================================

  // Sentry (error tracking)
  SENTRY_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false')
    .description('Enable Sentry error tracking'),
  SENTRY_DSN: Joi.string()
    .uri()
    .optional()
    .description('Sentry DSN for error tracking'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('debug', 'info', 'warn', 'error')
    .default('info'),
});

/**
 * Typed configuration interface
 */
export interface AppConfig {
  // Required
  database: {
    url: string;
  };
  security: {
    encryptionKey: string;
  };
  auth: {
    mode: 'local' | 'clerk';
    clerkSecretKey?: string;
  };

  // Server
  nodeEnv: 'development' | 'production' | 'test';
  port: number;

  // Redis
  redis: {
    host: string;
    port: number;
    url?: string;
  };

  // CORS
  corsOrigins: string[];
  allowedOrigins: string[];

  // API
  apiBaseUrl: string;

  // Optional
  sentry?: {
    dsn: string;
  };
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Configuration factory - transforms env vars into typed config
 */
export const configuration = (): AppConfig => ({
  // Required
  database: {
    url: process.env.DATABASE_URL!,
  },
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY!,
  },
  auth: {
    mode: (process.env.AUTH_MODE as 'local' | 'clerk') || 'clerk',
    clerkSecretKey: process.env.CLERK_SECRET_KEY,
  },

  // Server
  nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'development',
  port: parseInt(process.env.PORT || '3001', 10),

  // Redis - REDIS_URL takes priority over REDIS_HOST/REDIS_PORT
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  // CORS
  corsOrigins: (
    process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000'
  ).split(','),
  allowedOrigins: (
    process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000'
  ).split(','),

  // API
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001',

  // Optional
  sentry: process.env.SENTRY_DSN ? { dsn: process.env.SENTRY_DSN } : undefined,
  logLevel: (process.env.LOG_LEVEL as AppConfig['logLevel']) || 'info',
});
