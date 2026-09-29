import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/product.entity';
import { StockMovement } from './stock-movement.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { AuthCommonModule } from '../auth/auth-common.module';
import { CategoriesModule } from '../categories/categories.module';
import { AccountingModule } from '../accounting/accounting.module';
import { CostRevaluation } from './cost-revaluation.entity';
import { TimeTrustModule } from '../time-trust/time-trust.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, StockMovement, CostRevaluation]),
    AuthCommonModule,
    CategoriesModule,
    AccountingModule,
    TimeTrustModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
