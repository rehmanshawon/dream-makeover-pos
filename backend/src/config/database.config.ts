import './env';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Customer } from '../customers/customer.entity';
import { Product } from '../products/product.entity';
import { SalonService } from '../services/service.entity';
import { Transaction } from '../transactions/transaction.entity';
import { User } from '../users/user.entity';
import { TransactionItem } from '../transactions/transaction-item.entity';
import { Package } from '../packages/package.entity';
import { PackageItem } from '../packages/package-item.entity';
import { StockMovement } from '../inventory/stock-movement.entity';
import { Employee } from '../employees/employee.entity';
import { SalaryPayment } from '../salary-payments/salary-payment.entity';
import { Expense } from '../expenses/expense.entity';
import { Category } from '../categories/category.entity';
import { migrations } from '../database/migrations';
import { PayPeriod } from '../payroll/pay-period.entity';
import { Attendance } from '../attendance/attendance.entity';
import { Account } from '../accounting/account.entity';
import { JournalEntry } from '../accounting/journal-entry.entity';
import { JournalLine } from '../accounting/journal-line.entity';
import { BankReconciliation } from '../accounting/bank-reconciliation.entity';
import { BankReconciliationLine } from '../accounting/bank-reconciliation-line.entity';
import { Purchase } from '../purchases/purchase.entity';
import { PurchaseLine } from '../purchases/purchase-line.entity';
import { SalesReturn } from '../returns/sales-return.entity';
import { SalesReturnLine } from '../returns/sales-return-line.entity';
import { SupplierReturn } from '../purchases/supplier-return.entity';
import { SupplierReturnLine } from '../purchases/supplier-return-line.entity';
import { CostRevaluation } from '../inventory/cost-revaluation.entity';
import { AccountingPeriod } from '../accounting/accounting-period.entity';
import { JournalEntryPeriodSubscriber } from '../accounting/journal-entry-period.subscriber';
const env = process.env;

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: env.DB_HOST ?? '127.0.0.1',
  port: Number(env.DB_PORT ?? 3306),
  username: env.DB_USERNAME ?? 'dream_app',
  password: env.DB_PASSWORD ?? 'change_me',
  database: env.DB_DATABASE ?? 'dream_makeover',
  entities: [
    Customer,
    Product,
    SalonService,
    Transaction,
    TransactionItem,
    User,
    Package,
    PackageItem,
    StockMovement,
    Employee,
    SalaryPayment,
    Expense,
    Category,
    PayPeriod,
    Attendance,
    Account,
    JournalEntry,
    JournalLine,
    BankReconciliation,
    BankReconciliationLine,
    Purchase,
    PurchaseLine,
    SalesReturn,
    SalesReturnLine,
    SupplierReturn,
    SupplierReturnLine,
    CostRevaluation,
    AccountingPeriod,
  ],
  subscribers: [JournalEntryPeriodSubscriber],
  migrations,
  migrationsRun: true,
  synchronize: false,
  logging: env.NODE_ENV === 'development',
};
