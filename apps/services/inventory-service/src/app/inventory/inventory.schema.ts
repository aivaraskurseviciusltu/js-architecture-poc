import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type InventoryDocument = HydratedDocument<InventorySchema>;

@Schema({ timestamps: true, collection: 'inventory' })
export class InventorySchema {
  @Prop({ required: true, unique: true }) productId!: string;
  @Prop({ required: true, default: 0 }) stock!: number;
}

export const InventoryMongooseSchema = SchemaFactory.createForClass(InventorySchema);
