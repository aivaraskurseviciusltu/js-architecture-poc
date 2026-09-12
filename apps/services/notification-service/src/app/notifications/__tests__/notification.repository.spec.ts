import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotificationRepository } from '../notification.repository';
import { NotificationSchema } from '../notification.schema';

function makeModel() {
  return { create: jest.fn(), find: jest.fn() };
}

describe('NotificationRepository', () => {
  let repo:  NotificationRepository;
  let model: ReturnType<typeof makeModel>;

  beforeEach(async () => {
    model = makeModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationRepository,
        { provide: getModelToken(NotificationSchema.name), useValue: model },
      ],
    }).compile();

    repo = module.get<NotificationRepository>(NotificationRepository);
  });

  describe('create', () => {
    it('persists the notification data', async () => {
      const data = { orderId: 'ord-1', customerId: 'cust-1', totalAmount: 50 };
      const doc  = { ...data, channel: 'email', status: 'sent' };
      model.create.mockResolvedValue(doc);

      const result = await repo.create(data);

      expect(model.create).toHaveBeenCalledWith(data);
      expect(result).toBe(doc);
    });
  });

  describe('findAll', () => {
    it('returns notifications sorted by createdAt descending, limited to 50', async () => {
      const docs = [{ orderId: 'ord-1' }];
      const exec  = jest.fn().mockResolvedValue(docs);
      const limit = jest.fn().mockReturnValue({ exec });
      const sort  = jest.fn().mockReturnValue({ limit });
      model.find.mockReturnValue({ sort });

      const result = await repo.findAll();

      expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(limit).toHaveBeenCalledWith(50);
      expect(result).toBe(docs);
    });
  });
});
