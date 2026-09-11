import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { AllExceptionsFilter } from './app/filters/all-exceptions.filter';
import { initMetrics } from '@poc/shared-types';

if (process.env['NODE_ENV'] !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });
}

initMetrics('order_service');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);
  Logger.log(`🚀 Order Service running on: http://localhost:${port}`);
}

bootstrap();
