import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventorySchema, InventoryMongooseSchema } from './inventory.schema';
import { ProcessedEventSchema, ProcessedEventMongooseSchema } from './processed-event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventorySchema.name, schema: InventoryMongooseSchema },
      { name: ProcessedEventSchema.name, schema: ProcessedEventMongooseSchema },
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
