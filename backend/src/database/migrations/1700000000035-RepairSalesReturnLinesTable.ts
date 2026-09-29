import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairSalesReturnLinesTable1700000000035 implements MigrationInterface {
  name = 'RepairSalesReturnLinesTable1700000000035';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sales_returns (
        id CHAR(36) NOT NULL,
        transaction_id CHAR(36) NOT NULL,
        return_date DATE NOT NULL,
        refund_method ENUM('CASH', 'BANK', 'MOBILE') NOT NULL DEFAULT 'CASH',
        refund_minor BIGINT UNSIGNED NOT NULL,
        revenue_reversal_minor BIGINT UNSIGNED NOT NULL,
        vat_reversal_minor BIGINT UNSIGNED NOT NULL,
        cogs_reversal_minor BIGINT UNSIGNED NOT NULL,
        note VARCHAR(255) NULL,
        created_by VARCHAR(80) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY idx_sales_returns_transaction (transaction_id),
        CONSTRAINT fk_sales_returns_transaction FOREIGN KEY (transaction_id)
          REFERENCES transactions(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sales_return_lines (
        id CHAR(36) NOT NULL,
        sales_return_id CHAR(36) NOT NULL,
        transaction_item_id CHAR(36) NOT NULL,
        product_id CHAR(36) NOT NULL,
        quantity INT UNSIGNED NOT NULL,
        gross_minor BIGINT UNSIGNED NOT NULL,
        revenue_reversal_minor BIGINT UNSIGNED NOT NULL,
        vat_reversal_minor BIGINT UNSIGNED NOT NULL,
        refund_minor BIGINT UNSIGNED NOT NULL,
        cogs_reversal_minor BIGINT UNSIGNED NOT NULL,
        PRIMARY KEY (id),
        KEY idx_sales_return_lines_return (sales_return_id),
        KEY idx_sales_return_lines_item (transaction_item_id),
        CONSTRAINT fk_sales_return_lines_return FOREIGN KEY (sales_return_id)
          REFERENCES sales_returns(id) ON DELETE RESTRICT,
        CONSTRAINT fk_sales_return_lines_item FOREIGN KEY (transaction_item_id)
          REFERENCES transaction_items(id) ON DELETE RESTRICT,
        CONSTRAINT fk_sales_return_lines_product FOREIGN KEY (product_id)
          REFERENCES products(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const sourceColumn = await queryRunner.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'accounting_journal_entries'
        AND COLUMN_NAME = 'source_sales_return_id'
    `);
    if (sourceColumn.length === 0) {
      await queryRunner.query(`
        ALTER TABLE accounting_journal_entries
        ADD COLUMN source_sales_return_id CHAR(36)
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL
      `);
    }

    const sourceIndex = await queryRunner.query(`
      SELECT INDEX_NAME FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'accounting_journal_entries'
        AND INDEX_NAME = 'uq_accounting_journal_entries_source_sales_return'
    `);
    if (sourceIndex.length === 0) {
      await queryRunner.query(`
        CREATE UNIQUE INDEX uq_accounting_journal_entries_source_sales_return
        ON accounting_journal_entries (source_sales_return_id)
      `);
    }

    const sourceForeignKey = await queryRunner.query(`
      SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'accounting_journal_entries'
        AND CONSTRAINT_NAME = 'fk_accounting_journal_entries_sales_return'
    `);
    if (sourceForeignKey.length === 0) {
      await queryRunner.query(`
        ALTER TABLE accounting_journal_entries
        ADD CONSTRAINT fk_accounting_journal_entries_sales_return
          FOREIGN KEY (source_sales_return_id) REFERENCES sales_returns(id) ON DELETE RESTRICT
      `);
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // This repair is intentionally irreversible to avoid dropping existing return history.
  }
}
