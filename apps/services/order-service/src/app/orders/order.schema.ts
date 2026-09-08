import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrderDocument = HydratedDocument<OrderSchema>;

@Schema({ _id: false })
export class OrderItemSchema {
  @Prop({ required: true }) productId!: string;
  @Prop({ required: true }) name!: string;
  @Prop({ required: true, min: 1 }) quantity!: number;
  @Prop({ required: true, min: 0 }) unitPrice!: number;
}

export const OrderItemSchemaFactory = SchemaFactory.createForClass(OrderItemSchema);

@Schema({ timestamps: true, collection: 'orders' })
export class OrderSchema {
  @Prop({ required: true }) customerId!: string;
  @Prop({ type: [OrderItemSchemaFactory], default: [] }) items!: OrderItemSchema[];
  @Prop({ required: true, min: 0 }) totalAmount!: number;
  @Prop({ default: 'pending' }) status!: string;
}

export const OrderMongooseSchema = SchemaFactory.createForClass(OrderSchema);
