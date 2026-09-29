import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Customer } from '../customers/customer.entity';
import { Product } from '../products/product.entity';
import { SalonService } from '../services/service.entity';
import { Transaction } from '../transactions/transaction.entity';
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
import { Purchase } from '../purchases/purchase.entity';
import { PurchaseLine } from '../purchases/purchase-line.entity';

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? 'dream_app',
  password: process.env.DB_PASSWORD ?? 'change_me',
  database: process.env.DB_DATABASE ?? 'dream_makeover',
  entities: [
    Customer,
    Product,
    SalonService,
    Transaction,
    TransactionItem,
    Package,
    PackageItem,
    PayPeriod,
    StockMovement,
    Employee,
    SalaryPayment,
    Expense,
    Category,
    Attendance,
    Account,
    JournalEntry,
    JournalLine,
    Purchase,
    PurchaseLine,
  ],
  migrations,
  synchronize: false,
  logging: true,
});
