import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalonService } from './service.entity';
import { SalonServicesController } from './salon-services.controller';
import { SalonServicesService } from './salon-services.service';
import { AuthCommonModule } from '../auth/auth-common.module';

@Module({
  imports: [TypeOrmModule.forFeature([SalonService]), AuthCommonModule],
  controllers: [SalonServicesController],
  providers: [SalonServicesService],
  exports: [SalonServicesService],
})
export class SalonServicesModule {}
