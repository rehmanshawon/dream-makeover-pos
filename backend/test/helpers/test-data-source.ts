import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Customer } from '../../src/customers/customer.entity';
import { Product } from '../../src/products/product.entity';
import { SalonService } from '../../src/services/service.entity';
import { Transaction } from '../../src/transactions/transaction.entity';
import { TransactionItem } from '../../src/transactions/transaction-item.entity';
import { User } from '../../src/users/user.entity';
import { Package } from '../../src/packages/package.entity';
import { PackageItem } from '../../src/packages/package-item.entity';
import { StockMovement } from '../../src/inventory/stock-movement.entity';
import { PayPeriod } from '../../src/payroll/pay-period.entity';
import { Employee } from '../../src/employees/employee.entity';
import { Attendance } from '../../src/attendance/attendance.entity';
import { SalaryPayment } from '../../src/salary-payments/salary-payment.entity';
import { Expense } from '../../src/expenses/expense.entity';
import { Category } from '../../src/categories/category.entity';
import { CategoryKind } from '../../src/categories/category-kind.enum';
import { Account } from '../../src/accounting/account.entity';
import { AccountType } from '../../src/accounting/account-type.enum';
import { JournalEntry } from '../../src/accounting/journal-entry.entity';
import { JournalLine } from '../../src/accounting/journal-line.entity';
import { Purchase } from '../../src/purchases/purchase.entity';
import { PurchaseLine } from '../../src/purchases/purchase-line.entity';
import { SalesReturn } from '../../src/returns/sales-return.entity';
import { SalesReturnLine } from '../../src/returns/sales-return-line.entity';
import { SupplierReturn } from '../../src/purchases/supplier-return.entity';
import { SupplierReturnLine } from '../../src/purchases/supplier-return-line.entity';
import { CostRevaluation } from '../../src/inventory/cost-revaluation.entity';
import { AccountingPeriod } from '../../src/accounting/accounting-period.entity';
import { JournalEntryPeriodSubscriber } from '../../src/accounting/journal-entry-period.subscriber';
import { BankReconciliation } from '../../src/accounting/bank-reconciliation.entity';
import { BankReconciliationLine } from '../../src/accounting/bank-reconciliation-line.entity';
import { LoyaltySettings } from '../../src/loyalty/loyalty-settings.entity';

export const TEST_PRODUCT_CATEGORY_ID = '11111111-1111-4111-8111-111111111111';
export const TEST_SERVICE_CATEGORY_ID = '22222222-2222-4222-8222-222222222222';
const TEST_TABLES = [
  'accounting_journal_lines',
  'accounting_journal_entries',
  'accounting_periods',
  'accounting_bank_reconciliation_lines',
  'accounting_bank_reconciliations',
  'supplier_return_lines',
  'supplier_returns',
  'inventory_cost_revaluations',
  'sales_return_lines',
  'sales_returns',
  'purchase_lines',
  'purchases',
  'transaction_items',
  'transactions',
  'stock_movements',
  'package_items',
  'packages',
  'products',
  'services',
  'customers',
  'users',
  'salary_payments',
  'pay_periods',
  'attendance_records',
  'employees',
  'expenses',
  'categories',
  'accounting_accounts',
  'loyalty_settings',
];

const TEST_ACCOUNTING_ACCOUNTS: Account[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    code: 'CASH',
    name: 'Cash on hand',
    type: AccountType.ASSET,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    code: 'BANK',
    name: 'Business bank',
    type: AccountType.ASSET,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    code: 'OWNER_CAPITAL',
    name: 'Owner capital',
    type: AccountType.EQUITY,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    code: 'OWNER_DRAWINGS',
    name: 'Owner drawings',
    type: AccountType.CONTRA_EQUITY,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    code: 'MOBILE_WALLET',
    name: 'Mobile wallet',
    type: AccountType.ASSET,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000006',
    code: 'CARD_PAYABLE',
    name: 'Card payable',
    type: AccountType.LIABILITY,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000007',
    code: 'OTHER_PAYABLE',
    name: 'Other payable / clearing',
    type: AccountType.LIABILITY,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000008',
    code: 'EXPENSE_ELECTRICITY',
    name: 'Electricity expense',
    type: AccountType.EXPENSE,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000009',
    code: 'EXPENSE_WATER',
    name: 'Water expense',
    type: AccountType.EXPENSE,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000010',
    code: 'EXPENSE_INTERNET',
    name: 'Internet expense',
    type: AccountType.EXPENSE,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000011',
    code: 'EXPENSE_RENT',
    name: 'Rent expense',
    type: AccountType.EXPENSE,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000012',
    code: 'EXPENSE_MAINTENANCE',
    name: 'Maintenance expense',
    type: AccountType.EXPENSE,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000013',
    code: 'EXPENSE_CLEANING',
    name: 'Cleaning expense',
    type: AccountType.EXPENSE,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000014',
    code: 'EXPENSE_STATIONERY',
    name: 'Stationery expense',
    type: AccountType.EXPENSE,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000015',
    code: 'EXPENSE_TRANSPORTATION',
    name: 'Transportation expense',
    type: AccountType.EXPENSE,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000016',
    code: 'EXPENSE_MARKETING',
    name: 'Marketing expense',
    type: AccountType.EXPENSE,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000017',
    code: 'EXPENSE_EQUIPMENT',
    name: 'Equipment expense',
    type: AccountType.EXPENSE,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000018',
    code: 'EXPENSE_MISC',
    name: 'Miscellaneous expense',
    type: AccountType.EXPENSE,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000019',
    code: 'SALES_REVENUE',
    name: 'Sales revenue',
    type: AccountType.REVENUE,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000020',
    code: 'VAT_PAYABLE',
    name: 'VAT payable',
    type: AccountType.LIABILITY,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000021',
    code: 'INVENTORY',
    name: 'Inventory asset',
    type: AccountType.ASSET,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000022',
    code: 'COST_OF_GOODS_SOLD',
    name: 'Cost of goods sold',
    type: AccountType.EXPENSE,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000023',
    code: 'ACCOUNTS_PAYABLE',
    name: 'Supplier payables',
    type: AccountType.LIABILITY,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000024',
    code: 'OPENING_BALANCE_EQUITY',
    name: 'Opening balance equity',
    type: AccountType.EQUITY,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000025',
    code: 'PAYROLL_EXPENSE',
    name: 'Payroll expense',
    type: AccountType.EXPENSE,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000026',
    code: 'EMPLOYEE_ADVANCES',
    name: 'Employee advances',
    type: AccountType.ASSET,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000027',
    code: 'INVENTORY_SHRINKAGE',
    name: 'Inventory shrinkage',
    type: AccountType.EXPENSE,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000028',
    code: 'INVENTORY_ADJUSTMENT_GAIN',
    name: 'Inventory adjustment gain',
    type: AccountType.REVENUE,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000029',
    code: 'SUPPLIER_RETURN_LOSS',
    name: 'Supplier return variance loss',
    type: AccountType.EXPENSE,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000030',
    code: 'SUPPLIER_RETURN_GAIN',
    name: 'Supplier return variance gain',
    type: AccountType.REVENUE,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000031',
    code: 'INVENTORY_REVALUATION_LOSS',
    name: 'Inventory revaluation loss',
    type: AccountType.EXPENSE,
    isSystem: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000032',
    code: 'INVENTORY_REVALUATION_GAIN',
    name: 'Inventory revaluation gain',
    type: AccountType.REVENUE,
    isSystem: true,
  },
];

/**
 * Creates a DataSource connected to the dedicated test database with a
 * guaranteed clean schema.
 *
 * Why we do not use `dropSchema: true`:
 * MySQL refuses to drop parent tables while child tables reference them.
 * TypeORM's `dropSchema` executes DROP TABLE without disabling foreign key
 * checks, which fails silently on tables like `customers` when
 * `transactions` still references them via FK.
 *
 * We therefore drop tables manually with FK checks disabled, then let
 * `synchronize: true` rebuild the schema.
 *
 * All integration tests must use this helper.
 */
export async function createTestDataSource(): Promise<DataSource> {
  const env =
    (
      globalThis as typeof globalThis & {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process?.env ?? {};

  const dataSource = new DataSource({
    type: 'mysql',
    host: env.DB_HOST ?? '127.0.0.1',
    port: Number(env.DB_PORT ?? 3306),
    username: env.DB_USERNAME ?? 'dream_app',
    password: env.DB_PASSWORD ?? 'change_me',
    database: env.DB_DATABASE ?? 'dream_makeover_test',
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
      SupplierReturn,
      SupplierReturnLine,
      SalesReturn,
      SalesReturnLine,
      CostRevaluation,
      AccountingPeriod,
      LoyaltySettings,
    ],
    subscribers: [JournalEntryPeriodSubscriber],
    synchronize: false,
    dropSchema: false,
    logging: false,
  });

  await dataSource.initialize();
  await dropAllTables(dataSource);
  await dataSource.synchronize(); // Rebuild the schema after dropping all tables
  await seedDefaultCategories(dataSource);
  // Add foreign keys that synchronize does not emit because we
  // declare foreign keys as scalar columns.
  await dataSource.query(`
  ALTER TABLE categories
    ADD CONSTRAINT fk_categories_parent
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE RESTRICT
`);
  await dataSource.query(`
  ALTER TABLE products
    ADD CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
`);
  await dataSource.query(`
  ALTER TABLE services
    ADD CONSTRAINT fk_services_category
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
`);
  // Existing CHECK constraint for package_items
  await dataSource.query(`
  ALTER TABLE package_items
  ADD CONSTRAINT chk_package_items_kind CHECK (
    (item_kind = 'SERVICE' AND service_id IS NOT NULL AND product_id IS NULL)
    OR
    (item_kind = 'PRODUCT' AND product_id IS NOT NULL AND service_id IS NULL)
  )
`);

  await dataSource.query(`
  ALTER TABLE salary_payments
    ADD CONSTRAINT fk_salary_payments_period
    FOREIGN KEY (pay_period_id) REFERENCES pay_periods(id) ON DELETE SET NULL
`);

  await dataSource.query(`
  ALTER TABLE attendance_records
    ADD CONSTRAINT fk_attendance_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
`);
  await dataSource.query(`
  ALTER TABLE accounting_journal_entries
    ADD CONSTRAINT fk_accounting_journal_entries_expense
    FOREIGN KEY (source_expense_id) REFERENCES expenses(id) ON DELETE RESTRICT
`);
  await dataSource.query(`
  ALTER TABLE accounting_journal_entries
    ADD CONSTRAINT fk_accounting_journal_entries_transaction
    FOREIGN KEY (source_transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT
`);
  await dataSource.query(`
  ALTER TABLE accounting_journal_entries
    ADD CONSTRAINT fk_accounting_journal_entries_purchase
    FOREIGN KEY (source_purchase_id) REFERENCES purchases(id) ON DELETE RESTRICT
`);
  await dataSource.query(`
  ALTER TABLE accounting_journal_entries
    ADD CONSTRAINT fk_accounting_journal_entries_salary_payment
    FOREIGN KEY (source_salary_payment_id) REFERENCES salary_payments(id) ON DELETE RESTRICT
`);
  await dataSource.query(`
  ALTER TABLE accounting_journal_entries
    ADD CONSTRAINT fk_accounting_journal_entries_stock_movement
    FOREIGN KEY (source_stock_movement_id) REFERENCES stock_movements(id) ON DELETE RESTRICT
`);
  await dataSource.query(`
  ALTER TABLE accounting_journal_entries
    ADD CONSTRAINT fk_accounting_journal_entries_sales_return
    FOREIGN KEY (source_sales_return_id) REFERENCES sales_returns(id) ON DELETE RESTRICT
`);
  await dataSource.query(`
  ALTER TABLE accounting_journal_entries
    ADD CONSTRAINT fk_accounting_journal_entries_supplier_return
    FOREIGN KEY (source_supplier_return_id) REFERENCES supplier_returns(id) ON DELETE RESTRICT
`);
  await dataSource.query(`
  ALTER TABLE accounting_journal_entries
    ADD CONSTRAINT fk_accounting_journal_entries_cost_revaluation
    FOREIGN KEY (source_cost_revaluation_id) REFERENCES inventory_cost_revaluations(id) ON DELETE RESTRICT
`);
  return dataSource;
}

/**
 * Truncates all business tables while temporarily disabling foreign key checks.
 *
 * Use this between tests inside a file to reset state without dropping the schema.
 */
export async function truncateAllTables(dataSource: DataSource): Promise<void> {
  await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of TEST_TABLES) {
    await dataSource.query(`TRUNCATE TABLE \`${table}\``);
  }
  await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  await seedDefaultCategories(dataSource);
  await seedDefaultAccountingAccounts(dataSource);
}

async function seedDefaultCategories(dataSource: DataSource): Promise<void> {
  await dataSource.getRepository(Category).save([
    {
      id: TEST_PRODUCT_CATEGORY_ID,
      name: 'Cosmetics',
      slug: 'cosmetics',
      kind: CategoryKind.PRODUCT,
    },
    {
      id: TEST_SERVICE_CATEGORY_ID,
      name: 'Services',
      slug: 'services',
      kind: CategoryKind.SERVICE,
    },
  ]);
}

async function seedDefaultAccountingAccounts(dataSource: DataSource): Promise<void> {
  await dataSource.getRepository(Account).save(TEST_ACCOUNTING_ACCOUNTS);
}

/**
 * Drops all business tables while temporarily disabling foreign key checks.
 *
 * Use this before initializing the schema to ensure a clean slate.
 */
async function dropAllTables(dataSource: DataSource): Promise<void> {
  await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of TEST_TABLES) {
    await dataSource.query(`DROP TABLE IF EXISTS \`${table}\``);
  }
  await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
}
