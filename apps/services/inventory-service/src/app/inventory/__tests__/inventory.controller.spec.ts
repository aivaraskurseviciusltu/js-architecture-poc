import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from '../inventory.controller';
import { InventoryService } from '../inventory.service';

describe('InventoryController', () => {
  let controller: InventoryController;
  let service: jest.Mocked<InventoryService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: { findStockByProductId: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
    service    = module.get(InventoryService);
  });

  it('getStockByProductId delegates to service and returns result', async () => {
    service.findStockByProductId.mockResolvedValue({ productId: 'p1', stock: 10 });

    const result = await controller.getStockByProductId('p1');

    expect(service.findStockByProductId).toHaveBeenCalledWith('p1');
    expect(result).toEqual({ productId: 'p1', stock: 10 });
  });
});
