import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { AuthCommonModule } from '../auth/auth-common.module';
import { CategoriesModule } from '../categories/categories.module';
@Module({
  imports: [TypeOrmModule.forFeature([Product]), AuthCommonModule, CategoriesModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
