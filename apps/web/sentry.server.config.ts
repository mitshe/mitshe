import * as Sentry from '@sentry/nextjs';

const isEnabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true';
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (isEnabled && dsn) {
  Sentry.init({
    dsn,

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Environment
    environment: process.env.NODE_ENV,
  });
}
