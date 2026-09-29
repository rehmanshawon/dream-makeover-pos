import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthCommonModule } from '../auth/auth-common.module';
import { TimeTrustModule } from '../time-trust/time-trust.module';
import { AccountingModule } from '../accounting/accounting.module';
import { InventoryModule } from '../inventory/inventory.module';
import { Purchase } from './purchase.entity';
import { PurchaseLine } from './purchase-line.entity';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Purchase, PurchaseLine]),
    AuthCommonModule,
    TimeTrustModule,
    AccountingModule,
    InventoryModule,
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
