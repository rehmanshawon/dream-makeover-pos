import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalonService } from './service.entity';
import { SalonServicesController } from './salon-services.controller';
import { SalonServicesService } from './salon-services.service';

@Module({
  imports: [TypeOrmModule.forFeature([SalonService])],
  controllers: [SalonServicesController],
  providers: [SalonServicesService],
  exports: [SalonServicesService],
})
export class SalonServicesModule {}
