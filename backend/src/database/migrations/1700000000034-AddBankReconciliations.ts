import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBankReconciliations1700000000034 implements MigrationInterface {
  name = 'AddBankReconciliations1700000000034';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE accounting_bank_reconciliations (
        id CHAR(36) NOT NULL,
        account_id CHAR(36) NOT NULL,
        statement_date DATE NOT NULL,
        opening_balance_minor BIGINT NOT NULL,
        closing_balance_minor BIGINT NOT NULL,
        cleared_movement_minor BIGINT NOT NULL,
        created_by VARCHAR(80) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY uq_accounting_bank_reconciliations_account_date (account_id, statement_date),
        KEY idx_accounting_bank_reconciliations_date (statement_date),
        CONSTRAINT fk_accounting_bank_reconciliations_account FOREIGN KEY (account_id)
          REFERENCES accounting_accounts(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`
      CREATE TABLE accounting_bank_reconciliation_lines (
        id CHAR(36) NOT NULL,
        reconciliation_id CHAR(36) NOT NULL,
        journal_line_id CHAR(36) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_accounting_bank_reconciliation_lines_journal_line (journal_line_id),
        KEY idx_accounting_bank_reconciliation_lines_reconciliation (reconciliation_id),
        CONSTRAINT fk_accounting_bank_reconciliation_lines_reconciliation FOREIGN KEY (reconciliation_id)
          REFERENCES accounting_bank_reconciliations(id) ON DELETE RESTRICT,
        CONSTRAINT fk_accounting_bank_reconciliation_lines_journal_line FOREIGN KEY (journal_line_id)
          REFERENCES accounting_journal_lines(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE accounting_bank_reconciliation_lines');
    await queryRunner.query('DROP TABLE accounting_bank_reconciliations');
  }
}
