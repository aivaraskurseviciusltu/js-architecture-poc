import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
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
  providers: [InventoryRepository, InventoryService],
})
export class InventoryModule {}
