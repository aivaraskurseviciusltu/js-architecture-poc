import { Injectable } from '@nestjs/common';
import { OrderRepository } from './order.repository';
import { CreateOrderDto } from './create-order.dto';
import { Order, OrderCreatedEvent } from '@poc/shared-types';
import { EventPublisher } from '@poc/messaging';

@Injectable()
export class OrdersService {
  private readonly publisher: EventPublisher;

  constructor(private readonly orderRepository: OrderRepository) {
    const topicArn = process.env['SNS_ORDER_EVENTS_ARN'] ?? '';
    this.publisher = new EventPublisher(topicArn);
  }

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const doc = await this.orderRepository.create({ ...dto, totalAmount });
    const order = this.orderRepository.toOrder(doc);

    const event: OrderCreatedEvent = {
      orderId: order.id,
      customerId: order.customerId,
      items: order.items,
      totalAmount: order.totalAmount,
      timestamp: new Date().toISOString(),
    };
    await this.publisher.publish<OrderCreatedEvent>('OrderCreated', event);

    return order;
  }

  async findOrderById(id: string): Promise<Order> {
    const doc = await this.orderRepository.findById(id);
    return this.orderRepository.toOrder(doc);
  }

  async findAllOrders(): Promise<Order[]> {
    const docs = await this.orderRepository.findAll();
    return docs.map(doc => this.orderRepository.toOrder(doc));
  }
}
