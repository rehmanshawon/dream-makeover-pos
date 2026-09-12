import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../transaction.entity';
import { TransactionItem } from '../transaction-item.entity';
import { Product } from '../../products/product.entity';
import { SalonService } from '../../services/service.entity';
import { Customer } from '../../customers/customer.entity';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { AuthCommonModule } from '../../auth/auth-common.module';
import { InvoiceNumberService } from '../invoice-number.service';
import { InventoryModule } from '../../inventory/inventory.module';
import { Package } from '../../packages/package.entity';
import { PackageItem } from '../../packages/package-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      TransactionItem,
      Product,
      SalonService,
      Customer,
      Package,
      PackageItem,
    ]),
    AuthCommonModule,
    InventoryModule,
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService, InvoiceNumberService],
  exports: [CheckoutService, InvoiceNumberService],
})
export class CheckoutModule {}
