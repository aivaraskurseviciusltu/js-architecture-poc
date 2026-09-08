import { Controller, Get, Param } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get(':productId')
  getStock(@Param('productId') productId: string) {
    return this.inventoryService.getStock(productId);
  }
}
