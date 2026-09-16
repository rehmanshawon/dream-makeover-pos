import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './transaction.entity';
import { TransactionItem } from './transaction-item.entity';
import { Customer } from '../customers/customer.entity';
import { CheckoutModule } from './checkout/checkout.module';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { AuthCommonModule } from '../auth/auth-common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, TransactionItem, Customer]),
    CheckoutModule,
    AuthCommonModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TypeOrmModule, TransactionsService],
})
export class TransactionsModule {}
