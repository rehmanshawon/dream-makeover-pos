import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionItem } from '../transactions/transaction-item.entity';
import { Product } from '../products/product.entity';
import { Expense } from '../expenses/expense.entity';
import { SalaryPayment } from '../salary-payments/salary-payment.entity';
import { FinancialSummaryService } from './financial-summary.service';
import { ReportsController } from './reports.controller';
import { AuthCommonModule } from '../auth/auth-common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, TransactionItem, Product, Expense, SalaryPayment]),
    AuthCommonModule,
  ],
  controllers: [ReportsController],
  providers: [FinancialSummaryService],
  exports: [FinancialSummaryService],
})
export class ReportsModule {}
