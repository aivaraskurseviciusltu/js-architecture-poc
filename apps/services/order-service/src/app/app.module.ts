import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersModule } from './orders/orders.module';
import { HealthModule } from './health/health.module';
import { MongoSanitizeMiddleware } from './middleware/mongo-sanitize.middleware';
import { MetricsMiddleware, MetricsController } from '@poc/shared-types';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
        dbName: config.get<string>('MONGODB_DB', 'orders'),
      }),
      inject: [ConfigService],
    }),
    OrdersModule,
    HealthModule,
  ],
  controllers: [MetricsController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MongoSanitizeMiddleware, MetricsMiddleware).forRoutes('*');
  }
}
