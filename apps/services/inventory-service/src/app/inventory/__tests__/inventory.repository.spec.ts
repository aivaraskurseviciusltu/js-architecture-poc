import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { InventoryRepository } from '../inventory.repository';
import { InventorySchema } from '../inventory.schema';

function makeModel() {
  return {
    findOne:          jest.fn(),
    findOneAndUpdate: jest.fn(),
  };
}

describe('InventoryRepository', () => {
  let repo:  InventoryRepository;
  let model: ReturnType<typeof makeModel>;

  beforeEach(async () => {
    model = makeModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryRepository,
        { provide: getModelToken(InventorySchema.name), useValue: model },
      ],
    }).compile();

    repo = module.get<InventoryRepository>(InventoryRepository);
  });

  describe('findByProductId', () => {
    it('queries by productId and returns the document', async () => {
      const doc = { productId: 'p1', stock: 5 };
      model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });

      const result = await repo.findByProductId('p1');

      expect(model.findOne).toHaveBeenCalledWith({ productId: 'p1' });
      expect(result).toBe(doc);
    });

    it('returns null when no document exists', async () => {
      model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      expect(await repo.findByProductId('missing')).toBeNull();
    });
  });

  describe('upsertStock', () => {
    it('increments stock by delta using findOneAndUpdate', async () => {
      const updated = { productId: 'p1', stock: 8 };
      model.findOneAndUpdate.mockResolvedValue(updated);

      const result = await repo.upsertStock('p1', 3);

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { productId: 'p1' },
        { $inc: { stock: 3 } },
        { upsert: true, new: true },
      );
      expect(result).toBe(updated);
    });

    it('decrements stock with a negative delta', async () => {
      model.findOneAndUpdate.mockResolvedValue({ productId: 'p1', stock: 2 });
      await repo.upsertStock('p1', -3);
      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { productId: 'p1' },
        { $inc: { stock: -3 } },
        expect.anything(),
      );
    });
  });
});
