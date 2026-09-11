import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationSchema, NotificationDocument } from './notification.schema';

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectModel(NotificationSchema.name) private readonly model: Model<NotificationDocument>,
  ) {}

  async create(data: { orderId: string; customerId: string; totalAmount: number }): Promise<NotificationDocument> {
    return this.model.create(data);
  }

  async findAll(): Promise<NotificationDocument[]> {
    return this.model.find().sort({ createdAt: -1 }).limit(50).exec();
  }
}
