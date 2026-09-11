import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrderSchema, OrderDocument } from './order.schema';
import { CreateOrderDto } from './create-order.dto';
import { Order } from '@poc/shared-types';

@Injectable()
export class OrderRepository {
  constructor(
    @InjectModel(OrderSchema.name) private readonly model: Model<OrderDocument>,
  ) {}

  async create(dto: CreateOrderDto & { totalAmount: number }): Promise<OrderDocument> {
    return this.model.create(dto);
  }

  async findById(id: string): Promise<OrderDocument> {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException(`Order ${id} not found`);
    return doc;
  }

  async findAll(): Promise<OrderDocument[]> {
    return this.model.find().sort({ createdAt: -1 }).exec();
  }

  toOrder(doc: OrderDocument): Order {
    const plain = doc.toObject({ virtuals: true }) as Record<string, unknown>;
    return {
      id: String(plain['_id']),
      customerId: plain['customerId'] as string,
      items: plain['items'] as Order['items'],
      totalAmount: plain['totalAmount'] as number,
      status: plain['status'] as Order['status'],
      createdAt: (plain['createdAt'] as Date).toISOString(),
      updatedAt: (plain['updatedAt'] as Date).toISOString(),
    };
  }
}
