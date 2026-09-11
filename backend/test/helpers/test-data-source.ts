import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Customer } from '../../src/customers/customer.entity';
import { Product } from '../../src/products/product.entity';
import { SalonService } from '../../src/services/service.entity';
import { Transaction } from '../../src/transactions/transaction.entity';
import { TransactionItem } from '../../src/transactions/transaction-item.entity';
import { User } from '../../src/users/user.entity';

/**
 * Creates a DataSource connected to the dedicated test database.
 *
 * All integration tests must use this helper so that:
 * - Every entity is registered
 * - Table creation order is consistent
 * - Schema is dropped and rebuilt from scratch before each test file runs
 *
 * Test files run with `--runInBand`, meaning files execute sequentially.
 * Each file owns the test database for its lifetime.
 */
export async function createTestDataSource(): Promise<DataSource> {
  const env = (globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }).process?.env ?? {};

  const dataSource = new DataSource({
    type: 'mysql',
    host: env.DB_HOST ?? '127.0.0.1',
    port: Number(env.DB_PORT ?? 3306),
    username: env.DB_USERNAME ?? 'dream_app',
    password: env.DB_PASSWORD ?? 'change_me',
    database: env.DB_DATABASE ?? 'dream_makeover_test',
    entities: [Customer, Product, SalonService, Transaction, TransactionItem, User],
    synchronize: true,
    dropSchema: true,
    logging: false,
  });

  await dataSource.initialize();
  return dataSource;
}

/**
 * Truncates all business tables while temporarily disabling foreign key checks.
 *
 * Use this between tests inside a file to reset state without dropping the schema.
 */
export async function truncateAllTables(dataSource: DataSource): Promise<void> {
  await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
  await dataSource.query('TRUNCATE TABLE transaction_items');
  await dataSource.query('TRUNCATE TABLE transactions');
  await dataSource.query('TRUNCATE TABLE products');
  await dataSource.query('TRUNCATE TABLE services');
  await dataSource.query('TRUNCATE TABLE customers');
  await dataSource.query('TRUNCATE TABLE users');
  await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
}
