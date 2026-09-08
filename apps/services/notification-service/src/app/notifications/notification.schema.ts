import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<NotificationSchema>;

@Schema({ timestamps: true, collection: 'notifications' })
export class NotificationSchema {
  @Prop({ required: true }) orderId!: string;
  @Prop({ required: true }) customerId!: string;
  @Prop({ required: true }) totalAmount!: number;
  @Prop({ default: 'email' }) channel!: string;
  @Prop({ default: 'sent' }) status!: string;
}

export const NotificationMongooseSchema = SchemaFactory.createForClass(NotificationSchema);
