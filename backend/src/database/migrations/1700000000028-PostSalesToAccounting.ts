import { MigrationInterface, QueryRunner } from 'typeorm';

export class PostSalesToAccounting1700000000028 implements MigrationInterface {
  name = 'PostSalesToAccounting1700000000028';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE accounting_accounts
      MODIFY type ENUM('ASSET', 'EQUITY', 'CONTRA_EQUITY', 'LIABILITY', 'EXPENSE', 'REVENUE') NOT NULL
    `);
    await queryRunner.query(`
      INSERT INTO accounting_accounts (id, code, name, type, is_system) VALUES
        ('00000000-0000-4000-8000-000000000019', 'SALES_REVENUE', 'Sales revenue', 'REVENUE', 1),
        ('00000000-0000-4000-8000-000000000020', 'VAT_PAYABLE', 'VAT payable', 'LIABILITY', 1)
    `);
    await queryRunner.query(`
      ALTER TABLE accounting_journal_entries
      MODIFY entry_type ENUM('OWNER_CONTRIBUTION', 'OWNER_WITHDRAWAL', 'CASH_BANK_TRANSFER', 'EXPENSE_PAYMENT', 'SALE_RECEIPT') NOT NULL,
      ADD COLUMN source_transaction_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
      ADD UNIQUE KEY uq_accounting_journal_entries_source_transaction (source_transaction_id),
      ADD CONSTRAINT fk_accounting_journal_entries_transaction FOREIGN KEY (source_transaction_id)
        REFERENCES transactions (id) ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      INSERT INTO accounting_journal_entries
        (id, entry_type, entry_date, memo, reference, created_by, created_at, source_transaction_id)
      SELECT UUID(), 'SALE_RECEIPT', DATE(tx.created_at), CONCAT('POS sale ', tx.invoice_id),
        tx.invoice_id, tx.cashier, tx.created_at, tx.id
      FROM transactions tx
      WHERE tx.total_minor > 0
    `);
    await queryRunner.query(`
      INSERT INTO accounting_journal_lines (id, entry_id, account_id, debit_minor, credit_minor)
      SELECT UUID(), entry.id, cash.id, tx.total_minor, 0
      FROM transactions tx
      JOIN accounting_journal_entries entry ON entry.source_transaction_id = tx.id
      JOIN accounting_accounts cash ON cash.code = 'CASH'
    `);
    await queryRunner.query(`
      INSERT INTO accounting_journal_lines (id, entry_id, account_id, debit_minor, credit_minor)
      SELECT UUID(), entry.id, revenue.id, 0, tx.subtotal_minor - tx.discount_minor
      FROM transactions tx
      JOIN accounting_journal_entries entry ON entry.source_transaction_id = tx.id
      JOIN accounting_accounts revenue ON revenue.code = 'SALES_REVENUE'
      WHERE tx.subtotal_minor > tx.discount_minor
    `);
    await queryRunner.query(`
      INSERT INTO accounting_journal_lines (id, entry_id, account_id, debit_minor, credit_minor)
      SELECT UUID(), entry.id, vat.id, 0, tx.vat_minor
      FROM transactions tx
      JOIN accounting_journal_entries entry ON entry.source_transaction_id = tx.id
      JOIN accounting_accounts vat ON vat.code = 'VAT_PAYABLE'
      WHERE tx.vat_minor > 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE line FROM accounting_journal_lines line
      JOIN accounting_journal_entries entry ON entry.id = line.entry_id
      WHERE entry.entry_type = 'SALE_RECEIPT'
    `);
    await queryRunner.query(
      `DELETE FROM accounting_journal_entries WHERE entry_type = 'SALE_RECEIPT'`,
    );
    await queryRunner.query(`
      ALTER TABLE accounting_journal_entries
      DROP FOREIGN KEY fk_accounting_journal_entries_transaction,
      DROP INDEX uq_accounting_journal_entries_source_transaction,
      DROP COLUMN source_transaction_id,
      MODIFY entry_type ENUM('OWNER_CONTRIBUTION', 'OWNER_WITHDRAWAL', 'CASH_BANK_TRANSFER', 'EXPENSE_PAYMENT') NOT NULL
    `);
    await queryRunner.query(
      `DELETE FROM accounting_accounts WHERE code IN ('SALES_REVENUE', 'VAT_PAYABLE')`,
    );
    await queryRunner.query(`
      ALTER TABLE accounting_accounts
      MODIFY type ENUM('ASSET', 'EQUITY', 'CONTRA_EQUITY', 'LIABILITY', 'EXPENSE') NOT NULL
    `);
  }
}
