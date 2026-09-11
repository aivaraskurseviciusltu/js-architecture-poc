import { Injectable, BadGatewayException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Order } from '@poc/shared-types';
import { CreateOrderDto } from './create-order.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.getOrThrow<string>('ORDER_SERVICE_URL');
  }

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<Order>(`${this.baseUrl}/orders`, dto),
      );
      return data;
    } catch (err) {
      this.logger.error('createOrder failed', err);
      throw new BadGatewayException('Failed to reach order-service');
    }
  }

  async findOrderById(id: string): Promise<Order> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<Order>(`${this.baseUrl}/orders/${id}`),
      );
      return data;
    } catch (err) {
      this.logger.error(`findOrderById(${id}) failed`, err);
      throw new BadGatewayException('Failed to reach order-service');
    }
  }

  async findAllOrders(): Promise<Order[]> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<Order[]>(`${this.baseUrl}/orders`),
      );
      return data;
    } catch (err) {
      this.logger.error('findAllOrders failed', err);
      throw new BadGatewayException('Failed to reach order-service');
    }
  }
}
