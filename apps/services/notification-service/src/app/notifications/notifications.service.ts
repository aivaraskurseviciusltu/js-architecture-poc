import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SqsConsumer, MessageEnvelope, MessageHandler } from '@poc/messaging';
import { OrderCreatedEvent } from '@poc/shared-types';
import { NotificationRepository } from './notification.repository';
import { NotificationDocument } from './notification.schema';
import { ProcessedEventSchema, ProcessedEventDocument } from './processed-event.schema';

@Injectable()
export class NotificationsService
  implements MessageHandler<OrderCreatedEvent>, OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(NotificationsService.name);
  private readonly consumer: SqsConsumer;

  constructor(
    private readonly notificationRepository: NotificationRepository,
    @InjectModel(ProcessedEventSchema.name) private readonly processedModel: Model<ProcessedEventDocument>,
  ) {
    this.consumer = new SqsConsumer({
      queueUrl: process.env['SQS_NOTIFICATION_QUEUE_URL'] ?? 'http://localhost:4566/000000000000/notification-queue',
    });
  }

  onApplicationBootstrap(): void {
    this.consumer.start<OrderCreatedEvent>(this);
    this.logger.log('SQS consumer started on notification-queue');
  }

  onApplicationShutdown(): void {
    this.consumer.stop();
  }

  async handle(envelope: MessageEnvelope<OrderCreatedEvent>, messageId: string): Promise<void> {
    // Idempotency check
    try {
      await this.processedModel.create({ messageId, processedAt: new Date() });
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) {
        this.logger.warn(`Duplicate message ${messageId}, skipping`);
        return;
      }
      throw err;
    }

    const { orderId, customerId, totalAmount } = envelope.payload;
    this.logger.log(`Sending notification for order ${orderId} to customer ${customerId}`);

    await this.notificationRepository.create({ orderId, customerId, totalAmount });
  }

  async findAllNotifications(): Promise<NotificationDocument[]> {
    return this.notificationRepository.findAll();
  }
}
