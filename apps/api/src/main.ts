import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import type { AppConfig } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Required for webhook signature verification
  });
  const logger = new Logger('Bootstrap');
  const config = app.get(ConfigService<AppConfig>);

  const nodeEnv = config.get('nodeEnv', { infer: true }) || 'development';
  const corsOrigins = config.get('corsOrigins', { infer: true }) || [
    'http://localhost:3000',
  ];

  logger.log(`Starting in ${nodeEnv} mode...`);

  // Enable CORS
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Security headers (helmet)
  app.use(
    helmet({
      contentSecurityPolicy: nodeEnv === 'production',
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI Tasks API')
    .setDescription('API for AI-powered task automation platform')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your Clerk JWT token or API key',
      },
      'bearer',
    )
    .addTag('projects', 'Project management')
    .addTag('tasks', 'Task operations')
    .addTag('workflows', 'Workflow builder')
    .addTag('integrations', 'External integrations')
    .addTag('api-keys', 'API key management')
    .addTag('Sessions', 'Interactive agent sessions')
    .addTag('Presets', 'Reusable agent presets')
    .addTag('Environments', 'Container environment configurations')
    .build();

  // Swagger: enabled in dev, disabled in production unless ENABLE_SWAGGER=true
  if (nodeEnv !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, document);
    logger.log('Swagger API docs available at /api');
  } else {
    logger.log('Swagger API docs disabled in production (set ENABLE_SWAGGER=true to enable)');
  }

  const port = config.get('port', { infer: true }) || 3001;
  await app.listen(port);

  logger.log(`Application running on: http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api`);
  logger.log(`Environment: ${nodeEnv}`);
}
void bootstrap();
