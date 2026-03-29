import * as Sentry from '@sentry/nextjs';

const isEnabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true';
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (isEnabled && dsn) {
  Sentry.init({
    dsn,

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session replay (optional - captures user sessions for debugging)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Environment
    environment: process.env.NODE_ENV,

    // Filter out known noise
    ignoreErrors: [
      // Network errors
      'Failed to fetch',
      'NetworkError',
      'Load failed',
      // Browser extensions
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
    ],
  });
}
