import { Module, Global, type OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

@Global()
@Module({})
export class SentryModule implements OnModuleInit {
  private readonly logger = new Logger(SentryModule.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const enabled = this.configService.get<string>('SENTRY_ENABLED') === 'true';
    const dsn = this.configService.get<string>('SENTRY_DSN');
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';

    // Skip Sentry if not explicitly enabled or no DSN
    if (!enabled || !dsn) {
      this.logger.log('Disabled - SENTRY_ENABLED not set to true or no DSN');
      return;
    }

    Sentry.init({
      dsn,
      environment: nodeEnv,
      integrations: [nodeProfilingIntegration()],

      // Performance monitoring
      tracesSampleRate: nodeEnv === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in staging
      profilesSampleRate: nodeEnv === 'production' ? 0.1 : 1.0,

      // Only send errors in production/staging
      enabled: nodeEnv !== 'development',

      // Filter out sensitive data
      beforeSend(event) {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['x-api-key'];
        }
        return event;
      },
    });

    this.logger.log(`Initialized for ${nodeEnv} environment`);
  }
}
