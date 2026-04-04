import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import Redis from 'ioredis';

// Config
import { configuration, configValidationSchema } from './config';

// Infrastructure
import { PrismaModule } from './infrastructure/persistence/prisma/prisma.module';
import { WebSocketModule } from './infrastructure/websocket/websocket.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { WebhooksModule } from './infrastructure/webhooks/webhooks.module';
import { AdaptersModule } from './infrastructure/adapters/adapters.module';
import { GitModule } from './infrastructure/git/git.module';
import { DockerModule } from './infrastructure/docker/docker.module';
import { SentryModule } from './infrastructure/sentry/sentry.module';

// Shared
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './shared/auth';
import { AuditModule } from './shared/audit';

// Application Layer (CQRS handlers)
import { ApplicationModule } from './application/application.module';

// Feature Modules
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { RepositoriesModule } from './modules/repositories/repositories.module';
import { AICredentialsModule } from './modules/ai-credentials/ai-credentials.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { AuditApiModule } from './modules/audit/audit.module';
import { UsersModule } from './modules/users/users.module';
import { AgentsModule } from './modules/agents/agents.module';
import { EnvironmentsModule } from './modules/environments/environments.module';
import { SessionsModule } from './modules/sessions/sessions.module';

// App
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrganizationThrottlerGuard } from './shared/guards/organization-throttler.guard';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';

@Module({
  imports: [
    // Config with validation - app fails fast if env vars are missing/invalid
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
      validationSchema: configValidationSchema,
      validationOptions: {
        abortEarly: false, // Show all validation errors at once
        allowUnknown: true, // Allow extra env vars not in schema
      },
    }),

    // CQRS
    CqrsModule.forRoot(),

    // Rate Limiting with Redis storage for distributed rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get('REDIS_URL');
        return {
          throttlers: [
            {
              name: 'short',
              ttl: 1000, // 1 second
              limit: 10, // 10 requests per second
            },
            {
              name: 'medium',
              ttl: 10000, // 10 seconds
              limit: 50, // 50 requests per 10 seconds
            },
            {
              name: 'long',
              ttl: 60000, // 1 minute
              limit: 200, // 200 requests per minute
            },
          ],
          storage: new ThrottlerStorageRedisService(
            redisUrl
              ? new Redis(redisUrl, { keyPrefix: 'throttle:' })
              : new Redis({
                  host: config.get('REDIS_HOST', 'redis'),
                  port: config.get('REDIS_PORT', 6379),
                  keyPrefix: 'throttle:',
                }),
          ),
        };
      },
    }),

    // BullMQ
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get('REDIS_URL');
        if (redisUrl) {
          const url = new URL(redisUrl);
          return {
            connection: {
              host: url.hostname,
              port: parseInt(url.port || '6379', 10),
            },
          };
        }
        return {
          connection: {
            host: config.get('redis.host', 'redis'),
            port: config.get('redis.port', 6379),
          },
        };
      },
    }),

    // Infrastructure
    SentryModule, // Error tracking - must be early in the imports
    PrismaModule,
    WebSocketModule,
    QueueModule,
    WebhooksModule,
    AdaptersModule,
    GitModule,
    DockerModule,
    SharedModule,
    AuthModule,
    AuditModule,

    // Application Layer (CQRS event handlers)
    ApplicationModule,

    // Feature Modules
    ProjectsModule,
    TasksModule,
    WorkflowsModule,
    IntegrationsModule,
    RepositoriesModule,
    AICredentialsModule,
    ApiKeysModule,
    AuditApiModule,
    UsersModule,
    AgentsModule,
    EnvironmentsModule,
    SessionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      // Global exception filter - consistent error responses
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      // Per-organization rate limiting (falls back to IP for public endpoints)
      provide: APP_GUARD,
      useClass: OrganizationThrottlerGuard,
    },
  ],
})
export class AppModule {}
