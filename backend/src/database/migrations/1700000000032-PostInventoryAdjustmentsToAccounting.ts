import { MigrationInterface, QueryRunner } from 'typeorm';

export class PostInventoryAdjustmentsToAccounting1700000000032 implements MigrationInterface {
  name = 'PostInventoryAdjustmentsToAccounting1700000000032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE accounting_journal_entries
      MODIFY entry_type ENUM(
        'OWNER_CONTRIBUTION', 'OWNER_WITHDRAWAL', 'CASH_BANK_TRANSFER',
        'EXPENSE_PAYMENT', 'SALE_RECEIPT', 'PURCHASE', 'SUPPLIER_PAYMENT',
        'OPENING_BALANCE', 'SALARY_PAYMENT', 'INVENTORY_ADJUSTMENT', 'SALES_RETURN'
      ) NOT NULL,
      ADD COLUMN source_stock_movement_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
      ADD UNIQUE KEY uq_accounting_journal_entries_source_stock_movement (source_stock_movement_id),
      ADD CONSTRAINT fk_accounting_journal_entries_stock_movement
        FOREIGN KEY (source_stock_movement_id) REFERENCES stock_movements(id) ON DELETE RESTRICT,
      ADD COLUMN source_sales_return_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
      ADD UNIQUE KEY uq_accounting_journal_entries_source_sales_return (source_sales_return_id)
    `);
    await queryRunner.query(`
      CREATE TABLE sales_returns (
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
      CREATE TABLE sales_return_lines (
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
    await queryRunner.query(`
      ALTER TABLE accounting_journal_entries
      ADD CONSTRAINT fk_accounting_journal_entries_sales_return
        FOREIGN KEY (source_sales_return_id) REFERENCES sales_returns(id) ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO accounting_accounts (id, code, name, type, is_system) VALUES
        ('00000000-0000-4000-8000-000000000027', 'INVENTORY_SHRINKAGE', 'Inventory shrinkage', 'EXPENSE', 1),
        ('00000000-0000-4000-8000-000000000028', 'INVENTORY_ADJUSTMENT_GAIN', 'Inventory adjustment gain', 'REVENUE', 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE line FROM accounting_journal_lines line
      INNER JOIN accounting_journal_entries entry ON entry.id = line.entry_id
      WHERE entry.source_sales_return_id IS NOT NULL
    `);
    await queryRunner.query(`
      DELETE FROM accounting_journal_entries WHERE source_sales_return_id IS NOT NULL
    `);
    await queryRunner.query(`
      DELETE line FROM accounting_journal_lines line
      INNER JOIN accounting_journal_entries entry ON entry.id = line.entry_id
      WHERE entry.source_stock_movement_id IS NOT NULL
    `);
    await queryRunner.query(`
      DELETE FROM accounting_journal_entries WHERE source_stock_movement_id IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE accounting_journal_entries
      DROP FOREIGN KEY fk_accounting_journal_entries_stock_movement,
      DROP INDEX uq_accounting_journal_entries_source_stock_movement,
      DROP COLUMN source_stock_movement_id,
      DROP FOREIGN KEY fk_accounting_journal_entries_sales_return,
      DROP INDEX uq_accounting_journal_entries_source_sales_return,
      DROP COLUMN source_sales_return_id,
      MODIFY entry_type ENUM(
        'OWNER_CONTRIBUTION', 'OWNER_WITHDRAWAL', 'CASH_BANK_TRANSFER',
        'EXPENSE_PAYMENT', 'SALE_RECEIPT', 'PURCHASE', 'SUPPLIER_PAYMENT',
        'OPENING_BALANCE', 'SALARY_PAYMENT'
      ) NOT NULL
    `);
    await queryRunner.query('DROP TABLE sales_return_lines');
    await queryRunner.query('DROP TABLE sales_returns');
    await queryRunner.query(
      `DELETE FROM accounting_accounts WHERE code IN ('INVENTORY_SHRINKAGE', 'INVENTORY_ADJUSTMENT_GAIN')`,
    );
  }
}
