import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { DataSource } from 'typeorm';
import { RepairSalesReturnLinesTable1700000000035 } from '../src/database/migrations/1700000000035-RepairSalesReturnLinesTable';
import { createTestDataSource } from './helpers/test-data-source';

describe('RepairSalesReturnLinesTable migration (integration)', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('repairs missing sales-return tables and journal source metadata', async () => {
    await dataSource.query(
      'ALTER TABLE accounting_journal_entries DROP FOREIGN KEY fk_accounting_journal_entries_sales_return',
    );
    await dataSource.query(
      'ALTER TABLE accounting_journal_entries DROP INDEX uq_accounting_journal_entries_source_sales_return',
    );
    await dataSource.query(
      'ALTER TABLE accounting_journal_entries DROP COLUMN source_sales_return_id',
    );
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    await dataSource.query('DROP TABLE IF EXISTS sales_return_lines');
    await dataSource.query('DROP TABLE IF EXISTS sales_returns');
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    const queryRunner = dataSource.createQueryRunner();
    try {
      await new RepairSalesReturnLinesTable1700000000035().up(queryRunner);
    } finally {
      await queryRunner.release();
    }

    const tables = await dataSource.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('sales_returns', 'sales_return_lines')`,
    );
    expect(tables.map((table: { TABLE_NAME: string }) => table.TABLE_NAME).sort()).toEqual([
      'sales_return_lines',
      'sales_returns',
    ]);
    const journalColumns = await dataSource.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounting_journal_entries'
         AND COLUMN_NAME = 'source_sales_return_id'`,
    );
    expect(journalColumns).toHaveLength(1);
    const journalForeignKeys = await dataSource.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'accounting_journal_entries'
         AND CONSTRAINT_NAME = 'fk_accounting_journal_entries_sales_return'`,
    );
    expect(journalForeignKeys).toHaveLength(1);
  });
});
