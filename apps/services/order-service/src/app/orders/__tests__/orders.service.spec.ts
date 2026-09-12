import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OrdersService } from '../orders.service';
import { OrderRepository } from '../order.repository';
import { Order } from '@poc/shared-types';

// Mock the EventPublisher so we don't need real AWS credentials
jest.mock('@poc/messaging', () => ({
  EventPublisher: jest.fn().mockImplementation(() => ({
    publish: jest.fn().mockResolvedValue(undefined),
  })),
}));

const mockOrder: Order = {
  id: 'ord-1',
  customerId: 'cust-1',
  items: [{ productId: 'p1', name: 'Widget', quantity: 2, unitPrice: 5 }],
  totalAmount: 10,
  status: 'pending',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('OrdersService (order-service)', () => {
  let service: OrdersService;
  let repo: jest.Mocked<OrderRepository>;

  beforeEach(async () => {
    const fakeDoc = { toObject: jest.fn(() => ({ _id: 'ord-1', customerId: 'cust-1', items: mockOrder.items, totalAmount: 10, status: 'pending', createdAt: new Date(), updatedAt: new Date() })) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: OrderRepository,
          useValue: {
            create:  jest.fn().mockResolvedValue(fakeDoc),
            findById: jest.fn().mockResolvedValue(fakeDoc),
            findAll: jest.fn().mockResolvedValue([fakeDoc]),
            toOrder: jest.fn().mockReturnValue(mockOrder),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    repo    = module.get(OrderRepository);
  });

  describe('createOrder', () => {
    it('calculates totalAmount and persists order, then publishes event', async () => {
      const dto = { customerId: 'cust-1', items: [{ productId: 'p1', name: 'Widget', quantity: 2, unitPrice: 5 }] };
      const result = await service.createOrder(dto);

      expect(repo.create).toHaveBeenCalledWith({ ...dto, totalAmount: 10 });
      expect(result).toEqual(mockOrder);
    });

    it('sums multiple items correctly', async () => {
      const dto = {
        customerId: 'cust-1',
        items: [
          { productId: 'p1', name: 'A', quantity: 2, unitPrice: 3 },
          { productId: 'p2', name: 'B', quantity: 1, unitPrice: 4 },
        ],
      };
      await service.createOrder(dto);
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ totalAmount: 10 }));
    });
  });

  describe('findOrderById', () => {
    it('returns the mapped order', async () => {
      const result = await service.findOrderById('ord-1');
      expect(repo.findById).toHaveBeenCalledWith('ord-1');
      expect(result).toEqual(mockOrder);
    });
  });

  describe('findAllOrders', () => {
    it('returns all mapped orders', async () => {
      const result = await service.findAllOrders();
      expect(result).toEqual([mockOrder]);
    });
  });
});
