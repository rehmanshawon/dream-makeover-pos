import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupplierReturnsAndCostRevaluation1700000000033 implements MigrationInterface {
  name = 'AddSupplierReturnsAndCostRevaluation1700000000033';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE accounting_journal_entries
      MODIFY entry_type ENUM(
        'OWNER_CONTRIBUTION', 'OWNER_WITHDRAWAL', 'CASH_BANK_TRANSFER',
        'EXPENSE_PAYMENT', 'SALE_RECEIPT', 'PURCHASE', 'SUPPLIER_PAYMENT',
        'OPENING_BALANCE', 'SALARY_PAYMENT', 'INVENTORY_ADJUSTMENT', 'SALES_RETURN',
        'SUPPLIER_RETURN', 'INVENTORY_REVALUATION'
      ) NOT NULL,
      ADD COLUMN source_supplier_return_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
      ADD UNIQUE KEY uq_accounting_journal_entries_source_supplier_return (source_supplier_return_id),
      ADD COLUMN source_cost_revaluation_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
      ADD UNIQUE KEY uq_accounting_journal_entries_source_cost_revaluation (source_cost_revaluation_id)
    `);
    await queryRunner.query(`
      ALTER TABLE stock_movements
      MODIFY reason ENUM('SALE', 'STOCK_IN', 'ADJUSTMENT', 'RETURN', 'PURCHASE', 'SUPPLIER_RETURN') NOT NULL
    `);
    await queryRunner.query(`
      CREATE TABLE supplier_returns (
        id CHAR(36) NOT NULL,
        purchase_id CHAR(36) NOT NULL,
        return_date DATE NOT NULL,
        supplier_name VARCHAR(150) NOT NULL,
        refund_method ENUM('CASH', 'BANK', 'MOBILE', 'CREDIT') NOT NULL,
        credit_minor BIGINT UNSIGNED NOT NULL,
        inventory_value_minor BIGINT UNSIGNED NOT NULL,
        variance_minor BIGINT UNSIGNED NOT NULL,
        note VARCHAR(255) NULL,
        created_by VARCHAR(80) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY idx_supplier_returns_purchase (purchase_id),
        KEY idx_supplier_returns_date (return_date),
        CONSTRAINT fk_supplier_returns_purchase FOREIGN KEY (purchase_id)
          REFERENCES purchases(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`
      CREATE TABLE supplier_return_lines (
        id CHAR(36) NOT NULL,
        supplier_return_id CHAR(36) NOT NULL,
        purchase_line_id CHAR(36) NOT NULL,
        product_id CHAR(36) NOT NULL,
        quantity INT UNSIGNED NOT NULL,
        supplier_credit_minor BIGINT UNSIGNED NOT NULL,
        inventory_value_minor BIGINT UNSIGNED NOT NULL,
        PRIMARY KEY (id),
        KEY idx_supplier_return_lines_return (supplier_return_id),
        KEY idx_supplier_return_lines_purchase_line (purchase_line_id),
        CONSTRAINT fk_supplier_return_lines_return FOREIGN KEY (supplier_return_id)
          REFERENCES supplier_returns(id) ON DELETE RESTRICT,
        CONSTRAINT fk_supplier_return_lines_purchase_line FOREIGN KEY (purchase_line_id)
          REFERENCES purchase_lines(id) ON DELETE RESTRICT,
        CONSTRAINT fk_supplier_return_lines_product FOREIGN KEY (product_id)
          REFERENCES products(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`
      CREATE TABLE inventory_cost_revaluations (
        id CHAR(36) NOT NULL,
        product_id CHAR(36) NOT NULL,
        effective_date DATE NOT NULL,
        stock_snapshot INT UNSIGNED NOT NULL,
        previous_unit_cost_minor BIGINT UNSIGNED NOT NULL,
        new_unit_cost_minor BIGINT UNSIGNED NOT NULL,
        inventory_value_delta_minor BIGINT NOT NULL,
        note VARCHAR(255) NULL,
        created_by VARCHAR(80) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY idx_inventory_cost_revaluations_product_date (product_id, effective_date),
        CONSTRAINT fk_inventory_cost_revaluations_product FOREIGN KEY (product_id)
          REFERENCES products(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`
      ALTER TABLE accounting_journal_entries
      ADD CONSTRAINT fk_accounting_journal_entries_supplier_return
        FOREIGN KEY (source_supplier_return_id) REFERENCES supplier_returns(id) ON DELETE RESTRICT,
      ADD CONSTRAINT fk_accounting_journal_entries_cost_revaluation
        FOREIGN KEY (source_cost_revaluation_id) REFERENCES inventory_cost_revaluations(id) ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO accounting_accounts (id, code, name, type, is_system) VALUES
        ('00000000-0000-4000-8000-000000000029', 'SUPPLIER_RETURN_LOSS', 'Supplier return variance loss', 'EXPENSE', 1),
        ('00000000-0000-4000-8000-000000000030', 'SUPPLIER_RETURN_GAIN', 'Supplier return variance gain', 'REVENUE', 1),
        ('00000000-0000-4000-8000-000000000031', 'INVENTORY_REVALUATION_LOSS', 'Inventory revaluation loss', 'EXPENSE', 1),
        ('00000000-0000-4000-8000-000000000032', 'INVENTORY_REVALUATION_GAIN', 'Inventory revaluation gain', 'REVENUE', 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE line FROM accounting_journal_lines line
      INNER JOIN accounting_journal_entries entry ON entry.id = line.entry_id
      WHERE entry.source_supplier_return_id IS NOT NULL OR entry.source_cost_revaluation_id IS NOT NULL
    `);
    await queryRunner.query(`
      DELETE FROM accounting_journal_entries
      WHERE source_supplier_return_id IS NOT NULL OR source_cost_revaluation_id IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE accounting_journal_entries
      DROP FOREIGN KEY fk_accounting_journal_entries_supplier_return,
      DROP FOREIGN KEY fk_accounting_journal_entries_cost_revaluation,
      DROP INDEX uq_accounting_journal_entries_source_supplier_return,
      DROP INDEX uq_accounting_journal_entries_source_cost_revaluation,
      DROP COLUMN source_supplier_return_id,
      DROP COLUMN source_cost_revaluation_id,
      MODIFY entry_type ENUM(
        'OWNER_CONTRIBUTION', 'OWNER_WITHDRAWAL', 'CASH_BANK_TRANSFER',
        'EXPENSE_PAYMENT', 'SALE_RECEIPT', 'PURCHASE', 'SUPPLIER_PAYMENT',
        'OPENING_BALANCE', 'SALARY_PAYMENT', 'INVENTORY_ADJUSTMENT', 'SALES_RETURN'
      ) NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE stock_movements
      MODIFY reason ENUM('SALE', 'STOCK_IN', 'ADJUSTMENT', 'RETURN', 'PURCHASE') NOT NULL
    `);
    await queryRunner.query('DROP TABLE supplier_return_lines');
    await queryRunner.query('DROP TABLE supplier_returns');
    await queryRunner.query('DROP TABLE inventory_cost_revaluations');
    await queryRunner.query(`
      DELETE FROM accounting_accounts WHERE code IN (
        'SUPPLIER_RETURN_LOSS', 'SUPPLIER_RETURN_GAIN',
        'INVENTORY_REVALUATION_LOSS', 'INVENTORY_REVALUATION_GAIN'
      )
    `);
  }
}
