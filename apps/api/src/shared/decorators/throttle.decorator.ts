import { Throttle, SkipThrottle } from '@nestjs/throttler';

/**
 * Skip rate limiting for this endpoint (e.g., webhooks that need high throughput)
 */
export const NoRateLimit = () => SkipThrottle();

/**
 * Standard rate limit (uses global defaults)
 */
export const StandardRateLimit = () =>
  Throttle({
    short: { limit: 10, ttl: 1000 },
    medium: { limit: 50, ttl: 10000 },
    long: { limit: 200, ttl: 60000 },
  });

/**
 * Strict rate limit for sensitive operations (auth, credentials)
 * 5 requests per second, 20 per 10 seconds, 60 per minute
 */
export const StrictRateLimit = () =>
  Throttle({
    short: { limit: 5, ttl: 1000 },
    medium: { limit: 20, ttl: 10000 },
    long: { limit: 60, ttl: 60000 },
  });

/**
 * Very strict rate limit for authentication endpoints
 * 3 requests per second, 10 per 10 seconds, 30 per minute
 */
export const AuthRateLimit = () =>
  Throttle({
    short: { limit: 3, ttl: 1000 },
    medium: { limit: 10, ttl: 10000 },
    long: { limit: 30, ttl: 60000 },
  });

/**
 * High throughput rate limit for webhook endpoints
 * 50 requests per second, 300 per 10 seconds, 1000 per minute
 */
export const WebhookRateLimit = () =>
  Throttle({
    short: { limit: 50, ttl: 1000 },
    medium: { limit: 300, ttl: 10000 },
    long: { limit: 1000, ttl: 60000 },
  });

/**
 * API rate limit for programmatic access
 * 30 requests per second, 150 per 10 seconds, 500 per minute
 */
export const ApiRateLimit = () =>
  Throttle({
    short: { limit: 30, ttl: 1000 },
    medium: { limit: 150, ttl: 10000 },
    long: { limit: 500, ttl: 60000 },
  });
