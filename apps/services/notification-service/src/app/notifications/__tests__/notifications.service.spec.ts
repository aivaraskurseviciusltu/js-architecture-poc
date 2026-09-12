import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotificationsService } from '../notifications.service';
import { NotificationRepository } from '../notification.repository';
import { ProcessedEventSchema } from '../processed-event.schema';

jest.mock('@poc/messaging', () => ({
  SqsConsumer: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop:  jest.fn(),
  })),
}));

function makeEnvelope(overrides = {}) {
  return {
    payload: {
      orderId:     'ord-1',
      customerId:  'cust-1',
      items:       [],
      totalAmount: 99.99,
      timestamp:   new Date().toISOString(),
      ...overrides,
    },
  };
}

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notifRepo: jest.Mocked<Pick<NotificationRepository, 'create' | 'findAll'>>;
  let processedModel: { create: jest.Mock };

  beforeEach(async () => {
    notifRepo      = { create: jest.fn().mockResolvedValue({}), findAll: jest.fn().mockResolvedValue([]) };
    processedModel = { create: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NotificationRepository,                      useValue: notifRepo      },
        { provide: getModelToken(ProcessedEventSchema.name),    useValue: processedModel },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
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
    it('creates a processed-event record and a notification', async () => {
      await service.handle(makeEnvelope() as never, 'msg-1');

      expect(processedModel.create).toHaveBeenCalledWith({ messageId: 'msg-1', processedAt: expect.any(Date) });
      expect(notifRepo.create).toHaveBeenCalledWith({
        orderId:     'ord-1',
        customerId:  'cust-1',
        totalAmount: 99.99,
      });
    });

    it('skips duplicate messages (code 11000) without creating a notification', async () => {
      const dupError = Object.assign(new Error('dup'), { code: 11000 });
      processedModel.create = jest.fn().mockRejectedValue(dupError);

      await service.handle(makeEnvelope() as never, 'msg-dup');

      expect(notifRepo.create).not.toHaveBeenCalled();
    });

    it('re-throws non-duplicate DB errors', async () => {
      processedModel.create = jest.fn().mockRejectedValue(new Error('db down'));
      await expect(service.handle(makeEnvelope() as never, 'msg-err')).rejects.toThrow('db down');
    });
  });

  describe('findAllNotifications()', () => {
    it('delegates to repository and returns results', async () => {
      const notifications = [{ orderId: 'ord-1' }] as never[];
      notifRepo.findAll.mockResolvedValue(notifications);

      const result = await service.findAllNotifications();

      expect(notifRepo.findAll).toHaveBeenCalled();
      expect(result).toBe(notifications);
    });
  });
});
