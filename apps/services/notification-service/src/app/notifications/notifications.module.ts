import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationSchema, NotificationMongooseSchema } from './notification.schema';
import { ProcessedEventSchema, ProcessedEventMongooseSchema } from './processed-event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationSchema.name, schema: NotificationMongooseSchema },
      { name: ProcessedEventSchema.name, schema: ProcessedEventMongooseSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
