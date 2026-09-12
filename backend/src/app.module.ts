import { Module } from '@nestjs/common';
import { ReportsModule } from './reports/reports.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { CustomersModule } from './customers/customers.module';
import { ProductsModule } from './products/products.module';
import { SalonServicesModule } from './services/salon-services.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CheckoutModule } from './transactions/checkout/checkout.module';
import { PackagesModule } from './packages/packages.module';
import { InventoryModule } from './inventory/inventory.module';
import { EmployeesModule } from './employees/employees.module';
import { SalaryPaymentsModule } from './salary-payments/salary-payments.module';
import { ExpensesModule } from './expenses/expenses.module';
@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    CustomersModule,
    ProductsModule,
    SalonServicesModule,
    TransactionsModule,
    UsersModule,
    AuthModule,
    CheckoutModule,
    PackagesModule,
    InventoryModule,
    EmployeesModule,
    SalaryPaymentsModule,
    ExpensesModule,
    ReportsModule,
  ],
})
export class AppModule {}
