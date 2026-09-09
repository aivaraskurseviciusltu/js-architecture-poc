import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import helmet from 'helmet';
import { AllExceptionsFilter } from './app/filters/all-exceptions.filter';

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
