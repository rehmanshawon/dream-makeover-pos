import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { CustomersModule } from './customers/customers.module';
import { ProductsModule } from './products/products.module';
import { SalonServicesModule } from './services/salon-services.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    CustomersModule,
    ProductsModule,
    SalonServicesModule,
    TransactionsModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
