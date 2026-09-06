import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { CustomersModule } from './customers/customers.module';
import { ProductsModule } from './products/products.module';
@Module({
  imports: [TypeOrmModule.forRoot(databaseConfig), CustomersModule, ProductsModule],
})
export class AppModule {}
