import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAccountingJournal1700000000026 implements MigrationInterface {
  name = 'CreateAccountingJournal1700000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE accounting_accounts (
        id CHAR(36) NOT NULL,
        code VARCHAR(30) NOT NULL,
        name VARCHAR(100) NOT NULL,
        type ENUM('ASSET', 'EQUITY', 'CONTRA_EQUITY') NOT NULL,
        is_system TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        UNIQUE KEY uq_accounting_accounts_code (code)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      INSERT INTO accounting_accounts (id, code, name, type, is_system) VALUES
        ('00000000-0000-4000-8000-000000000001', 'CASH', 'Cash on hand', 'ASSET', 1),
        ('00000000-0000-4000-8000-000000000002', 'BANK', 'Business bank', 'ASSET', 1),
        ('00000000-0000-4000-8000-000000000003', 'OWNER_CAPITAL', 'Owner capital', 'EQUITY', 1),
        ('00000000-0000-4000-8000-000000000004', 'OWNER_DRAWINGS', 'Owner drawings', 'CONTRA_EQUITY', 1)
    `);
    await queryRunner.query(`
      CREATE TABLE accounting_journal_entries (
        id CHAR(36) NOT NULL,
        entry_type ENUM('OWNER_CONTRIBUTION', 'OWNER_WITHDRAWAL', 'CASH_BANK_TRANSFER') NOT NULL,
        entry_date DATE NOT NULL,
        memo VARCHAR(255) NOT NULL,
        reference VARCHAR(100) NULL,
        created_by VARCHAR(80) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY idx_accounting_journal_entries_date (entry_date, created_at)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE accounting_journal_lines (
        id CHAR(36) NOT NULL,
        entry_id CHAR(36) NOT NULL,
        account_id CHAR(36) NOT NULL,
        debit_minor BIGINT UNSIGNED NOT NULL DEFAULT 0,
        credit_minor BIGINT UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        KEY idx_accounting_journal_lines_entry (entry_id),
        KEY idx_accounting_journal_lines_account (account_id),
        CONSTRAINT fk_accounting_journal_lines_entry FOREIGN KEY (entry_id)
          REFERENCES accounting_journal_entries (id) ON DELETE RESTRICT,
        CONSTRAINT fk_accounting_journal_lines_account FOREIGN KEY (account_id)
          REFERENCES accounting_accounts (id) ON DELETE RESTRICT,
        CONSTRAINT chk_accounting_journal_line_one_sided
          CHECK ((debit_minor = 0 AND credit_minor > 0) OR (credit_minor = 0 AND debit_minor > 0))
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE accounting_journal_lines');
    await queryRunner.query('DROP TABLE accounting_journal_entries');
    await queryRunner.query('DROP TABLE accounting_accounts');
  }
}
