import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from '../orders.controller';
import { OrdersService } from '../orders.service';
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

describe('OrdersController (order-service)', () => {
  let controller: OrdersController;
  let service: jest.Mocked<OrdersService>;

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
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    service    = module.get(OrdersService);
  });

  it('createOrder delegates to service', async () => {
    const dto = { customerId: 'cust-1', items: [{ productId: 'p1', name: 'Widget', quantity: 1, unitPrice: 10 }] };
    const result = await controller.createOrder(dto);
    expect(service.createOrder).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockOrder);
  });

  it('getAllOrders returns list', async () => {
    const result = await controller.getAllOrders();
    expect(service.findAllOrders).toHaveBeenCalled();
    expect(result).toEqual([mockOrder]);
  });

  it('getOrderById passes id to service', async () => {
    const result = await controller.getOrderById('ord-1');
    expect(service.findOrderById).toHaveBeenCalledWith('ord-1');
    expect(result).toEqual(mockOrder);
  });
});
