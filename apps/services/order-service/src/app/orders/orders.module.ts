import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderRepository } from './order.repository';
import { OrderSchema, OrderMongooseSchema } from './order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: OrderSchema.name, schema: OrderMongooseSchema }]),
  ],
  controllers: [OrdersController],
  providers: [OrderRepository, OrdersService],
})
export class OrdersModule {}
