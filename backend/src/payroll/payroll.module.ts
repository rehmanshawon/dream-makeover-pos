import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayPeriod } from './pay-period.entity';
import { PayPeriodsService } from './pay-periods.service';
import { PayPeriodsController } from './pay-periods.controller';
import { AuthCommonModule } from '../auth/auth-common.module';

@Module({
  imports: [TypeOrmModule.forFeature([PayPeriod]), AuthCommonModule],
  controllers: [PayPeriodsController],
  providers: [PayPeriodsService],
  exports: [PayPeriodsService],
})
export class PayrollModule {}
