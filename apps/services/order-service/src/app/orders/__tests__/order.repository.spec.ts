import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { OrderRepository } from '../order.repository';
import { OrderSchema } from '../order.schema';
import { Order } from '@poc/shared-types';

const NOW = new Date('2024-01-01T00:00:00.000Z');

function makeDoc(overrides: Partial<Record<string, unknown>> = {}) {
  const base = {
    _id: 'ord-1',
    customerId: 'cust-1',
    items: [{ productId: 'p1', name: 'Widget', quantity: 2, unitPrice: 5 }],
    totalAmount: 10,
    status: 'pending',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
  return { ...base, toObject: jest.fn(() => ({ virtuals: true, ...base })) };
}

describe('OrderRepository', () => {
  let repo: OrderRepository;
  let model: {
    create:   jest.Mock;
    findById: jest.Mock;
    find:     jest.Mock;
  };

  beforeEach(async () => {
    const exec       = jest.fn();
    const sort       = jest.fn().mockReturnValue({ exec });
    const findByIdFn = jest.fn().mockReturnValue({ exec });
    const findFn     = jest.fn().mockReturnValue({ sort });
    const createFn   = jest.fn();

    model = { create: createFn, findById: findByIdFn, find: findFn };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderRepository,
        { provide: getModelToken(OrderSchema.name), useValue: model },
      ],
    }).compile();

    repo = module.get<OrderRepository>(OrderRepository);
  });

  describe('create', () => {
    it('calls model.create with the provided dto', async () => {
      const doc = makeDoc();
      model.create.mockResolvedValue(doc);
      const dto = { customerId: 'cust-1', items: [], totalAmount: 0 };
      const result = await repo.create(dto);
      expect(model.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(doc);
    });
  });

  describe('findById', () => {
    it('returns document when found', async () => {
      const doc = makeDoc();
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });
      const result = await repo.findById('ord-1');
      expect(model.findById).toHaveBeenCalledWith('ord-1');
      expect(result).toBe(doc);
    });

    it('throws NotFoundException when document is null', async () => {
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(repo.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('returns documents sorted by createdAt descending', async () => {
      const doc = makeDoc();
      const exec = jest.fn().mockResolvedValue([doc]);
      const sort = jest.fn().mockReturnValue({ exec });
      model.find.mockReturnValue({ sort });

      const result = await repo.findAll();
      expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual([doc]);
    });
  });

  describe('toOrder', () => {
    it('maps a document to an Order shape', () => {
      const doc = makeDoc();
      const order: Order = repo.toOrder(doc as never);
      expect(order.id).toBe('ord-1');
      expect(order.customerId).toBe('cust-1');
      expect(order.totalAmount).toBe(10);
      expect(order.status).toBe('pending');
      expect(order.createdAt).toBe(NOW.toISOString());
    });
  });
});
