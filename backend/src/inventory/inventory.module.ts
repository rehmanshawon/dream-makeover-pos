import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/product.entity';
import { StockMovement } from './stock-movement.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { AuthCommonModule } from '../auth/auth-common.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product, StockMovement]), AuthCommonModule, CategoriesModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
