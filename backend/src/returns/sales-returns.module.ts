import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthCommonModule } from '../auth/auth-common.module';
import { TimeTrustModule } from '../time-trust/time-trust.module';
import { AccountingModule } from '../accounting/accounting.module';
import { InventoryModule } from '../inventory/inventory.module';
import { SalesReturn } from './sales-return.entity';
import { SalesReturnLine } from './sales-return-line.entity';
import { SalesReturnsController } from './sales-returns.controller';
import { SalesReturnsService } from './sales-returns.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalesReturn, SalesReturnLine]),
    AuthCommonModule,
    TimeTrustModule,
    AccountingModule,
    InventoryModule,
  ],
  controllers: [SalesReturnsController],
  providers: [SalesReturnsService],
  exports: [SalesReturnsService],
})
export class SalesReturnsModule {}
