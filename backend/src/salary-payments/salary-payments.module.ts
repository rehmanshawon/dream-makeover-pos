import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalaryPayment } from './salary-payment.entity';
import { Employee } from '../employees/employee.entity';
import { PayPeriod } from '../payroll/pay-period.entity';
import { SalaryPaymentsService } from './salary-payments.service';
import { SalaryPaymentsController } from './salary-payments.controller';
import { AuthCommonModule } from '../auth/auth-common.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalaryPayment, Employee, PayPeriod]),
    AuthCommonModule,
    AccountingModule,
  ],
  controllers: [SalaryPaymentsController],
  providers: [SalaryPaymentsService],
  exports: [SalaryPaymentsService],
})
export class SalaryPaymentsModule {}
