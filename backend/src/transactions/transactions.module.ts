import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './transaction.entity';
import { TransactionItem } from './transaction-item.entity';
import { CheckoutModule } from './checkout/checkout.module';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, TransactionItem]), CheckoutModule],
  exports: [TypeOrmModule],
})
export class TransactionsModule {}
