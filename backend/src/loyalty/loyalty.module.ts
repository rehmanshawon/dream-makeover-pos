import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthCommonModule } from '../auth/auth-common.module';
import { Customer } from '../customers/customer.entity';
import { LoyaltySettings } from './loyalty-settings.entity';
import { LoyaltySettingsController } from './loyalty-settings.controller';
import { LoyaltySettingsService } from './loyalty-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([LoyaltySettings, Customer]), AuthCommonModule],
  controllers: [LoyaltySettingsController],
  providers: [LoyaltySettingsService],
  exports: [LoyaltySettingsService],
})
export class LoyaltyModule {}
