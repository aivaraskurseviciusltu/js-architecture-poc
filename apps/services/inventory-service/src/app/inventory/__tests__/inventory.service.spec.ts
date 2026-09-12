import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { InventoryService } from '../inventory.service';
import { InventoryRepository } from '../inventory.repository';
import { ProcessedEventSchema } from '../processed-event.schema';

// Prevent the SqsConsumer from actually connecting to SQS during tests
jest.mock('@poc/messaging', () => ({
  SqsConsumer: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop:  jest.fn(),
  })),
}));

const mockRepo = () => ({
  findByProductId: jest.fn(),
  upsertStock:     jest.fn(),
});

function makeProcessedModel(createImpl?: jest.Mock) {
  return { create: createImpl ?? jest.fn().mockResolvedValue({}) };
}

function makeEnvelope(overrides = {}) {
  return {
    payload: {
      orderId:     'ord-1',
      customerId:  'cust-1',
      items: [{ productId: 'p1', name: 'Widget', quantity: 3, unitPrice: 5 }],
      totalAmount: 15,
      timestamp:   new Date().toISOString(),
      ...overrides,
    },
  };
}

describe('InventoryService', () => {
  let service: InventoryService;
  let repo: ReturnType<typeof mockRepo>;
  let processedModel: ReturnType<typeof makeProcessedModel>;

  beforeEach(async () => {
    repo           = mockRepo();
    processedModel = makeProcessedModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: InventoryRepository,                             useValue: repo           },
        { provide: getModelToken(ProcessedEventSchema.name),        useValue: processedModel },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('onApplicationBootstrap / onApplicationShutdown', () => {
    it('starts the SQS consumer on bootstrap', () => {
      const { SqsConsumer } = jest.requireMock('@poc/messaging');
      const instance = SqsConsumer.mock.results[SqsConsumer.mock.results.length - 1].value;
      service.onApplicationBootstrap();
      expect(instance.start).toHaveBeenCalled();
    });

    it('stops the SQS consumer on shutdown', () => {
      const { SqsConsumer } = jest.requireMock('@poc/messaging');
      const instance = SqsConsumer.mock.results[SqsConsumer.mock.results.length - 1].value;
      service.onApplicationShutdown();
      expect(instance.stop).toHaveBeenCalled();
    });
  });

  describe('handle()', () => {
    it('decrements stock for each item in the order', async () => {
      repo.upsertStock.mockResolvedValue({});
      await service.handle(makeEnvelope() as never, 'msg-1');

      expect(processedModel.create).toHaveBeenCalledWith({ messageId: 'msg-1', processedAt: expect.any(Date) });
      expect(repo.upsertStock).toHaveBeenCalledWith('p1', -3);
    });

    it('skips processing for duplicate messages (code 11000)', async () => {
      const dupError = Object.assign(new Error('dup'), { code: 11000 });
      processedModel.create = jest.fn().mockRejectedValue(dupError);

      await service.handle(makeEnvelope() as never, 'msg-dup');

      expect(repo.upsertStock).not.toHaveBeenCalled();
    });

    it('re-throws non-duplicate DB errors', async () => {
      processedModel.create = jest.fn().mockRejectedValue(new Error('db down'));
      await expect(service.handle(makeEnvelope() as never, 'msg-err')).rejects.toThrow('db down');
    });
  });

  describe('findStockByProductId()', () => {
    it('returns stock from repository', async () => {
      repo.findByProductId.mockResolvedValue({ stock: 42 });
      const result = await service.findStockByProductId('p1');
      expect(result).toEqual({ productId: 'p1', stock: 42 });
    });

    it('returns stock 0 when product is not found', async () => {
      repo.findByProductId.mockResolvedValue(null);
      const result = await service.findStockByProductId('unknown');
      expect(result).toEqual({ productId: 'unknown', stock: 0 });
    });
  });
});
