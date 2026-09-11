import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InventorySchema, InventoryDocument } from './inventory.schema';

@Injectable()
export class InventoryRepository {
  constructor(
    @InjectModel(InventorySchema.name) private readonly model: Model<InventoryDocument>,
  ) {}

  async findByProductId(productId: string): Promise<InventoryDocument | null> {
    return this.model.findOne({ productId }).exec();
  }

  async upsertStock(productId: string, delta: number): Promise<InventoryDocument> {
    return this.model.findOneAndUpdate(
      { productId },
      { $inc: { stock: delta } },
      { upsert: true, new: true },
    ) as Promise<InventoryDocument>;
  }
}
