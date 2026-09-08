import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SqsConsumer, MessageEnvelope, MessageHandler } from '@poc/messaging';
import { OrderCreatedEvent } from '@poc/shared-types';
import { InventorySchema, InventoryDocument } from './inventory.schema';
import { ProcessedEventSchema, ProcessedEventDocument } from './processed-event.schema';

@Injectable()
export class InventoryService
  implements MessageHandler<OrderCreatedEvent>, OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(InventoryService.name);
  private readonly consumer: SqsConsumer;

  constructor(
    @InjectModel(InventorySchema.name) private readonly inventoryModel: Model<InventoryDocument>,
    @InjectModel(ProcessedEventSchema.name) private readonly processedModel: Model<ProcessedEventDocument>,
  ) {
    this.consumer = new SqsConsumer({
      queueUrl: process.env['SQS_INVENTORY_QUEUE_URL'] ?? 'http://localhost:4566/000000000000/inventory-queue',
    });
  }

  onApplicationBootstrap() {
    this.consumer.start<OrderCreatedEvent>(this);
    this.logger.log('SQS consumer started on inventory-queue');
  }

  onApplicationShutdown() {
    this.consumer.stop();
  }

  async handle(envelope: MessageEnvelope<OrderCreatedEvent>, messageId: string): Promise<void> {
    // Idempotency check — unique index on messageId prevents duplicates
    try {
      await this.processedModel.create({ messageId, processedAt: new Date() });
    } catch (err: unknown) {
      // E11000 = duplicate key — already processed
      if ((err as { code?: number }).code === 11000) {
        this.logger.warn(`Duplicate message ${messageId}, skipping`);
        return;
      }
      throw err;
    }

    const { orderId, items } = envelope.payload;
    this.logger.log(`Processing OrderCreated ${orderId} — decrementing stock for ${items.length} item(s)`);

    for (const item of items) {
      await this.inventoryModel.findOneAndUpdate(
        { productId: item.productId },
        { $inc: { stock: -item.quantity } },
        { upsert: true, new: true },
      );
    }
  }

  async getStock(productId: string): Promise<{ productId: string; stock: number }> {
    const doc = await this.inventoryModel.findOne({ productId }).exec();
    return { productId, stock: doc?.stock ?? 0 };
  }
}
