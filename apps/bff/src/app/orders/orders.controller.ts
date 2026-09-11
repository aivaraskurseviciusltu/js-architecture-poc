import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './create-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('api/orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createOrder(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto);
  }

  @Get()
  @SkipThrottle()
  getAllOrders() {
    return this.ordersService.findAllOrders();
  }

  @Get(':id')
  @SkipThrottle()
  getOrderById(@Param('id') id: string) {
    return this.ordersService.findOrderById(id);
  }
}
