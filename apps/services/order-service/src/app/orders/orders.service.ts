import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrderSchema, OrderDocument } from './order.schema';
import { CreateOrderDto } from './create-order.dto';
import { Order } from '@poc/shared-types';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(OrderSchema.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  async create(dto: CreateOrderDto): Promise<Order> {
    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const created = await this.orderModel.create({ ...dto, totalAmount });
    return this.toOrder(created);
  }

  async findById(id: string): Promise<Order> {
    const doc = await this.orderModel.findById(id).exec();
    if (!doc) throw new NotFoundException(`Order ${id} not found`);
    return this.toOrder(doc);
  }

  private toOrder(doc: OrderDocument): Order {
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
