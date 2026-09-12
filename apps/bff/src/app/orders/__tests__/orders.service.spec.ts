import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadGatewayException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { OrdersService } from '../orders.service';
import { Order } from '@poc/shared-types';

const mockOrder: Order = {
  id: 'ord-1',
  customerId: 'cust-1',
  items: [{ productId: 'p1', name: 'Widget', quantity: 2, unitPrice: 5 }],
  totalAmount: 10,
  status: 'pending',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

function axiosResponse<T>(data: T): AxiosResponse<T> {
  return { data, status: 200, statusText: 'OK', headers: {}, config: {} as never };
}

describe('OrdersService (bff)', () => {
  let service: OrdersService;
  let http: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: HttpService,
          useValue: { post: jest.fn(), get: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn(() => 'http://order-service') },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    http    = module.get(HttpService);
  });

  describe('createOrder', () => {
    it('calls POST /orders and returns the created order', async () => {
      http.post.mockReturnValue(of(axiosResponse(mockOrder)));
      const dto = { customerId: 'cust-1', items: [{ productId: 'p1', name: 'Widget', quantity: 2, unitPrice: 5 }] };

      const result = await service.createOrder(dto);

      expect(http.post).toHaveBeenCalledWith('http://order-service/orders', dto);
      expect(result).toEqual(mockOrder);
    });

    it('throws BadGatewayException when the upstream call fails', async () => {
      http.post.mockReturnValue(throwError(() => new Error('network error')));
      await expect(service.createOrder({ customerId: 'c', items: [] })).rejects.toThrow(BadGatewayException);
    });
  });

  describe('findOrderById', () => {
    it('calls GET /orders/:id and returns the order', async () => {
      http.get.mockReturnValue(of(axiosResponse(mockOrder)));

      const result = await service.findOrderById('ord-1');

      expect(http.get).toHaveBeenCalledWith('http://order-service/orders/ord-1');
      expect(result).toEqual(mockOrder);
    });

    it('throws BadGatewayException on upstream failure', async () => {
      http.get.mockReturnValue(throwError(() => new Error('fail')));
      await expect(service.findOrderById('ord-1')).rejects.toThrow(BadGatewayException);
    });
  });

  describe('findAllOrders', () => {
    it('calls GET /orders and returns all orders', async () => {
      http.get.mockReturnValue(of(axiosResponse([mockOrder])));

      const result = await service.findAllOrders();

      expect(http.get).toHaveBeenCalledWith('http://order-service/orders');
      expect(result).toEqual([mockOrder]);
    });

    it('throws BadGatewayException on upstream failure', async () => {
      http.get.mockReturnValue(throwError(() => new Error('fail')));
      await expect(service.findAllOrders()).rejects.toThrow(BadGatewayException);
    });
  });
});
