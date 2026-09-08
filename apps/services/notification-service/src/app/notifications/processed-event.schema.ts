import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProcessedEventDocument = HydratedDocument<ProcessedEventSchema>;

@Schema({ collection: 'processed_events' })
export class ProcessedEventSchema {
  @Prop({ required: true, unique: true }) messageId!: string;
  @Prop({ required: true }) processedAt!: Date;
}

export const ProcessedEventMongooseSchema = SchemaFactory.createForClass(ProcessedEventSchema);
