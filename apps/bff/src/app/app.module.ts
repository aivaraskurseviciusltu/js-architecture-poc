import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { OrdersModule } from './orders/orders.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { MetricsMiddleware, MetricsController } from '@poc/shared-types';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limiting: 100 requests per minute per IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    AuthModule,
    OrdersModule,
    HealthModule,
  ],
  controllers: [MetricsController],
  providers: [
    // Apply rate-limiting globally
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MetricsMiddleware).forRoutes('*');
  }
}
