import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayPeriod } from './pay-period.entity';
import { PayPeriodsService } from './pay-periods.service';
import { PayPeriodsController } from './pay-periods.controller';
import { AuthCommonModule } from '../auth/auth-common.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { AutomaticPayPeriodService } from './automatic-pay-period.service';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PayPeriod]),
    AuthCommonModule,
    AttendanceModule,
    AccountingModule,
  ],
  controllers: [PayPeriodsController],
  providers: [PayPeriodsService, AutomaticPayPeriodService],
  exports: [PayPeriodsService],
})
export class PayrollModule {}
