import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderSchema, OrderMongooseSchema } from './order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: OrderSchema.name, schema: OrderMongooseSchema }]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
