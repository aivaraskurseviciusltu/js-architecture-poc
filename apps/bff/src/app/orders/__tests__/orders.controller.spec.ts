import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from '../orders.controller';
import { OrdersService } from '../orders.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Order } from '@poc/shared-types';

const mockOrder: Order = {
  id: 'ord-1',
  customerId: 'cust-1',
  items: [{ productId: 'p1', name: 'Widget', quantity: 1, unitPrice: 10 }],
  totalAmount: 10,
  status: 'pending',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('OrdersController (bff)', () => {
  let controller: OrdersController;
  let ordersService: jest.Mocked<OrdersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: {
            createOrder:   jest.fn().mockResolvedValue(mockOrder),
            findAllOrders: jest.fn().mockResolvedValue([mockOrder]),
            findOrderById: jest.fn().mockResolvedValue(mockOrder),
          },
        },
      ],
    })
      // Override the guard so we don't need a real JWT in unit tests
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrdersController>(OrdersController);
    ordersService = module.get(OrdersService);
  });

  it('createOrder delegates to service and returns order', async () => {
    const dto = { customerId: 'cust-1', items: [{ productId: 'p1', name: 'Widget', quantity: 1, unitPrice: 10 }] };
    const result = await controller.createOrder(dto);
    expect(ordersService.createOrder).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockOrder);
  });

  it('getAllOrders returns list from service', async () => {
    const result = await controller.getAllOrders();
    expect(ordersService.findAllOrders).toHaveBeenCalled();
    expect(result).toEqual([mockOrder]);
  });

  it('getOrderById delegates id to service', async () => {
    const result = await controller.getOrderById('ord-1');
    expect(ordersService.findOrderById).toHaveBeenCalledWith('ord-1');
    expect(result).toEqual(mockOrder);
  });
});
