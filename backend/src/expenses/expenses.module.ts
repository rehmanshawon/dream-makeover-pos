import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './expense.entity';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { AuthCommonModule } from '../auth/auth-common.module';
import { AccountingModule } from '../accounting/accounting.module';
import { TimeTrustModule } from '../time-trust/time-trust.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense]),
    AuthCommonModule,
    AccountingModule,
    TimeTrustModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
