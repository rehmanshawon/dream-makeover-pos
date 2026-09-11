import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Package } from './package.entity';
import { PackageItem } from './package-item.entity';
import { Product } from '../products/product.entity';
import { SalonService } from '../services/service.entity';
import { PackagesController } from './packages.controller';
import { PackagesService } from './packages.service';
import { AuthCommonModule } from '../auth/auth-common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Package, PackageItem, Product, SalonService]),
    AuthCommonModule,
  ],
  controllers: [PackagesController],
  providers: [PackagesService],
  exports: [PackagesService],
})
export class PackagesModule {}
