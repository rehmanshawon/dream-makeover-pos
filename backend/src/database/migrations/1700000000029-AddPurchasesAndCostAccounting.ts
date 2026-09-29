import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPurchasesAndCostAccounting1700000000029 implements MigrationInterface {
  name = 'AddPurchasesAndCostAccounting1700000000029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE accounting_accounts
      MODIFY type ENUM('ASSET', 'EQUITY', 'CONTRA_EQUITY', 'LIABILITY', 'EXPENSE', 'REVENUE') NOT NULL
    `);
    await queryRunner.query(`
      INSERT INTO accounting_accounts (id, code, name, type, is_system) VALUES
        ('00000000-0000-4000-8000-000000000021', 'INVENTORY', 'Inventory asset', 'ASSET', 1),
        ('00000000-0000-4000-8000-000000000022', 'COST_OF_GOODS_SOLD', 'Cost of goods sold', 'EXPENSE', 1),
        ('00000000-0000-4000-8000-000000000023', 'ACCOUNTS_PAYABLE', 'Supplier payables', 'LIABILITY', 1)
    `);
    await queryRunner.query(`
      ALTER TABLE accounting_journal_entries
      MODIFY entry_type ENUM('OWNER_CONTRIBUTION', 'OWNER_WITHDRAWAL', 'CASH_BANK_TRANSFER', 'EXPENSE_PAYMENT', 'SALE_RECEIPT', 'PURCHASE') NOT NULL,
      ADD COLUMN source_purchase_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
      ADD UNIQUE KEY uq_accounting_journal_entries_source_purchase (source_purchase_id)
    `);
    await queryRunner.query(`
      ALTER TABLE transactions
      ADD COLUMN cost_of_goods_sold_minor BIGINT UNSIGNED NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE transaction_items
      ADD COLUMN cost_of_goods_sold_minor BIGINT UNSIGNED NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      UPDATE transaction_items ti
      INNER JOIN products p ON p.id = ti.product_id
      SET ti.cost_of_goods_sold_minor = ti.quantity * p.purchase_cost_minor
      WHERE ti.item_type = 'PRODUCT'
    `);
    await queryRunner.query(`
      UPDATE transaction_items ti
      INNER JOIN (
        SELECT package_item.package_id, SUM(product.purchase_cost_minor) AS unit_cost_minor
        FROM package_items package_item
        INNER JOIN products product ON product.id = package_item.product_id
        WHERE package_item.item_kind = 'PRODUCT'
        GROUP BY package_item.package_id
      ) package_cost ON package_cost.package_id = ti.package_id
      SET ti.cost_of_goods_sold_minor = ti.quantity * package_cost.unit_cost_minor
      WHERE ti.item_type = 'PACKAGE'
    `);
    await queryRunner.query(`
      UPDATE transactions tx
      SET tx.cost_of_goods_sold_minor = (
        SELECT COALESCE(SUM(item.cost_of_goods_sold_minor), 0)
        FROM transaction_items item
        WHERE item.transaction_id = tx.id
      )
    `);
    await queryRunner.query(`
      INSERT INTO accounting_journal_lines (id, entry_id, account_id, debit_minor, credit_minor)
      SELECT UUID(), journal.id, cogs.id, tx.cost_of_goods_sold_minor, 0
      FROM transactions tx
      INNER JOIN accounting_journal_entries journal
        ON journal.source_transaction_id = tx.id
      INNER JOIN accounting_accounts cogs ON cogs.code = 'COST_OF_GOODS_SOLD'
      WHERE tx.cost_of_goods_sold_minor > 0
      UNION ALL
      SELECT UUID(), journal.id, inventory.id, 0, tx.cost_of_goods_sold_minor
      FROM transactions tx
      INNER JOIN accounting_journal_entries journal
        ON journal.source_transaction_id = tx.id
      INNER JOIN accounting_accounts inventory ON inventory.code = 'INVENTORY'
      WHERE tx.cost_of_goods_sold_minor > 0
    `);
    await queryRunner.query(`
      ALTER TABLE stock_movements
      MODIFY reason ENUM('SALE', 'STOCK_IN', 'ADJUSTMENT', 'RETURN', 'PURCHASE') NOT NULL
    `);
    await queryRunner.query(`
      CREATE TABLE purchases (
        id CHAR(36) NOT NULL,
        purchase_date DATE NOT NULL,
        supplier_name VARCHAR(150) NULL,
        supplier_reference VARCHAR(100) NULL,
        payment_method ENUM('CASH', 'BANK', 'MOBILE', 'CREDIT') NOT NULL,
        total_minor BIGINT UNSIGNED NOT NULL,
        created_by VARCHAR(80) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY idx_purchases_date (purchase_date, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`
      CREATE TABLE purchase_lines (
        id CHAR(36) NOT NULL,
        purchase_id CHAR(36) NOT NULL,
        product_id CHAR(36) NOT NULL,
        quantity INT UNSIGNED NOT NULL,
        unit_cost_minor BIGINT UNSIGNED NOT NULL,
        total_cost_minor BIGINT UNSIGNED NOT NULL,
        PRIMARY KEY (id),
        KEY idx_purchase_lines_purchase (purchase_id),
        KEY idx_purchase_lines_product (product_id),
        CONSTRAINT fk_purchase_lines_purchase FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE RESTRICT,
        CONSTRAINT fk_purchase_lines_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`
      ALTER TABLE accounting_journal_entries
      ADD CONSTRAINT fk_accounting_journal_entries_purchase FOREIGN KEY (source_purchase_id)
        REFERENCES purchases (id) ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE accounting_journal_entries DROP FOREIGN KEY fk_accounting_journal_entries_purchase',
    );
    await queryRunner.query(`
      DELETE line FROM accounting_journal_lines line
      INNER JOIN accounting_journal_entries entry ON entry.id = line.entry_id
      WHERE entry.id = '00000000-0000-4000-8000-000000000029'
    `);
    await queryRunner.query(
      `DELETE FROM accounting_journal_entries WHERE id = '00000000-0000-4000-8000-000000000029'`,
    );
    await queryRunner.query(`
      DELETE line FROM accounting_journal_lines line
      INNER JOIN accounting_accounts account ON account.id = line.account_id
      INNER JOIN accounting_journal_entries entry ON entry.id = line.entry_id
      WHERE account.code IN ('INVENTORY', 'COST_OF_GOODS_SOLD')
        AND entry.source_transaction_id IS NOT NULL
    `);
    await queryRunner.query('DROP TABLE purchase_lines');
    await queryRunner.query('DROP TABLE purchases');
    await queryRunner.query(`
      ALTER TABLE stock_movements
      MODIFY reason ENUM('SALE', 'STOCK_IN', 'ADJUSTMENT', 'RETURN') NOT NULL
    `);
    await queryRunner.query('ALTER TABLE transactions DROP COLUMN cost_of_goods_sold_minor');
    await queryRunner.query('ALTER TABLE transaction_items DROP COLUMN cost_of_goods_sold_minor');
    await queryRunner.query(`
      ALTER TABLE accounting_journal_entries
      DROP INDEX uq_accounting_journal_entries_source_purchase,
      DROP COLUMN source_purchase_id,
      MODIFY entry_type ENUM('OWNER_CONTRIBUTION', 'OWNER_WITHDRAWAL', 'CASH_BANK_TRANSFER', 'EXPENSE_PAYMENT', 'SALE_RECEIPT') NOT NULL
    `);
    await queryRunner.query(
      `DELETE FROM accounting_accounts WHERE code IN ('INVENTORY', 'COST_OF_GOODS_SOLD', 'ACCOUNTS_PAYABLE', 'OPENING_BALANCE_EQUITY')`,
    );
  }
}
