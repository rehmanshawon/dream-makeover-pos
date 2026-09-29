import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccountingPeriodControls1700000000036 implements MigrationInterface {
  name = 'AddAccountingPeriodControls1700000000036';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE accounting_periods (
        period_key CHAR(7) NOT NULL,
        closed_at DATETIME(6) NULL,
        closed_by VARCHAR(80) NULL,
        PRIMARY KEY (period_key),
        CONSTRAINT chk_accounting_period_key CHECK (period_key REGEXP '^[0-9]{4}-(0[1-9]|1[0-2])$')
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`
      ALTER TABLE accounting_journal_entries
      MODIFY entry_type ENUM(
        'OWNER_CONTRIBUTION', 'OWNER_WITHDRAWAL', 'CASH_BANK_TRANSFER',
        'EXPENSE_PAYMENT', 'SALE_RECEIPT', 'PURCHASE', 'SUPPLIER_PAYMENT',
        'OPENING_BALANCE', 'SALARY_PAYMENT', 'INVENTORY_ADJUSTMENT', 'SALES_RETURN',
        'SUPPLIER_RETURN', 'INVENTORY_REVALUATION', 'JOURNAL_REVERSAL'
      ) NOT NULL,
      ADD COLUMN source_reversal_entry_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
      ADD UNIQUE KEY uq_accounting_journal_entries_source_reversal (source_reversal_entry_id),
      ADD CONSTRAINT fk_accounting_journal_entries_source_reversal
        FOREIGN KEY (source_reversal_entry_id) REFERENCES accounting_journal_entries(id) ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
    throw new Error(
      'Accounting period closures and journal reversal history are intentionally irreversible.',
    );
  }
}
