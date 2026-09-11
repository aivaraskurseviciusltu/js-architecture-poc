import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import helmet from 'helmet';
import { AllExceptionsFilter } from './app/filters/all-exceptions.filter';
import { initMetrics } from '@poc/shared-types';

// Load .env in local dev (no-op in production where env vars are injected by the platform)
if (process.env['NODE_ENV'] !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
}

// Initialise Prometheus registry before the app starts
initMetrics('bff');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // Global validation — whitelist strips unknown properties, transform casts primitives
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));

  // Global exception filter — no stack traces in responses
  app.useGlobalFilters(new AllExceptionsFilter());

  // CORS — restrict to trusted origins in production
  const allowedOrigin = process.env['CORS_ORIGIN'] ?? '*';
  app.enableCors({ origin: allowedOrigin });

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
  Logger.log(`🚀 BFF running on: http://localhost:${port}`);
}

bootstrap();
