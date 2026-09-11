import { Controller, Get, Param } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get(':productId')
  getStockByProductId(@Param('productId') productId: string) {
    return this.inventoryService.findStockByProductId(productId);
  }
}
