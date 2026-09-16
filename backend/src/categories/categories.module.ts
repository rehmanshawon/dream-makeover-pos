import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { AuthCommonModule } from '../auth/auth-common.module';

@Module({
  imports: [TypeOrmModule.forFeature([Category]), AuthCommonModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
