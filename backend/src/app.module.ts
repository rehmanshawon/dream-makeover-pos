import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { CustomersModule } from './customers/customers.module';
import { ProductsModule } from './products/products.module';
import { SalonServicesModule } from './services/salon-services.module';
@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    CustomersModule,
    ProductsModule,
    SalonServicesModule,
  ],
})
export class AppModule {}
