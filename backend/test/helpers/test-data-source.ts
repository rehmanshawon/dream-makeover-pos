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

const TEST_TABLES = [
  'transaction_items',
  'transactions',
  'package_items',
  'packages',
  'products',
  'services',
  'customers',
  'users',
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
    ],
    synchronize: false,
    dropSchema: false,
    logging: false,
  });

  await dataSource.initialize();
  await dropAllTables(dataSource);
  await dataSource.synchronize(); // Rebuild the schema after dropping all tables
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
