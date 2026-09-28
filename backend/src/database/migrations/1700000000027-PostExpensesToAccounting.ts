import { MigrationInterface, QueryRunner } from 'typeorm';

export class PostExpensesToAccounting1700000000027 implements MigrationInterface {
  name = 'PostExpensesToAccounting1700000000027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE accounting_accounts
      MODIFY type ENUM('ASSET', 'EQUITY', 'CONTRA_EQUITY', 'LIABILITY', 'EXPENSE') NOT NULL
    `);
    await queryRunner.query(`
      INSERT INTO accounting_accounts (id, code, name, type, is_system) VALUES
        ('00000000-0000-4000-8000-000000000005', 'MOBILE_WALLET', 'Mobile wallet', 'ASSET', 1),
        ('00000000-0000-4000-8000-000000000006', 'CARD_PAYABLE', 'Card payable', 'LIABILITY', 1),
        ('00000000-0000-4000-8000-000000000007', 'OTHER_PAYABLE', 'Other payable / clearing', 'LIABILITY', 1),
        ('00000000-0000-4000-8000-000000000008', 'EXPENSE_ELECTRICITY', 'Electricity expense', 'EXPENSE', 1),
        ('00000000-0000-4000-8000-000000000009', 'EXPENSE_WATER', 'Water expense', 'EXPENSE', 1),
        ('00000000-0000-4000-8000-000000000010', 'EXPENSE_INTERNET', 'Internet expense', 'EXPENSE', 1),
        ('00000000-0000-4000-8000-000000000011', 'EXPENSE_RENT', 'Rent expense', 'EXPENSE', 1),
        ('00000000-0000-4000-8000-000000000012', 'EXPENSE_MAINTENANCE', 'Maintenance expense', 'EXPENSE', 1),
        ('00000000-0000-4000-8000-000000000013', 'EXPENSE_CLEANING', 'Cleaning expense', 'EXPENSE', 1),
        ('00000000-0000-4000-8000-000000000014', 'EXPENSE_STATIONERY', 'Stationery expense', 'EXPENSE', 1),
        ('00000000-0000-4000-8000-000000000015', 'EXPENSE_TRANSPORTATION', 'Transportation expense', 'EXPENSE', 1),
        ('00000000-0000-4000-8000-000000000016', 'EXPENSE_MARKETING', 'Marketing expense', 'EXPENSE', 1),
        ('00000000-0000-4000-8000-000000000017', 'EXPENSE_EQUIPMENT', 'Equipment expense', 'EXPENSE', 1),
        ('00000000-0000-4000-8000-000000000018', 'EXPENSE_MISC', 'Miscellaneous expense', 'EXPENSE', 1)
    `);
    await queryRunner.query(`
      ALTER TABLE accounting_journal_entries
      MODIFY entry_type ENUM('OWNER_CONTRIBUTION', 'OWNER_WITHDRAWAL', 'CASH_BANK_TRANSFER', 'EXPENSE_PAYMENT') NOT NULL,
      ADD COLUMN source_expense_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
      ADD UNIQUE KEY uq_accounting_journal_entries_source_expense (source_expense_id),
      ADD CONSTRAINT fk_accounting_journal_entries_expense FOREIGN KEY (source_expense_id)
        REFERENCES expenses (id) ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      INSERT INTO accounting_journal_entries
        (id, entry_type, entry_date, memo, reference, created_by, created_at, source_expense_id)
      SELECT UUID(), 'EXPENSE_PAYMENT', e.expense_date,
        CONCAT('Expense: ', LOWER(e.category), IF(e.payee IS NULL OR e.payee = '', '', CONCAT(' - ', e.payee))),
        e.reference, e.created_by, e.created_at, e.id
      FROM expenses e
    `);
    await queryRunner.query(`
      INSERT INTO accounting_journal_lines (id, entry_id, account_id, debit_minor, credit_minor)
      SELECT UUID(), j.id, a.id, e.amount_minor, 0
      FROM expenses e
      JOIN accounting_journal_entries j ON j.source_expense_id = e.id
      JOIN accounting_accounts a ON a.code = CONCAT('EXPENSE_', e.category)
    `);
    await queryRunner.query(`
      INSERT INTO accounting_journal_lines (id, entry_id, account_id, debit_minor, credit_minor)
      SELECT UUID(), j.id, a.id, 0, e.amount_minor
      FROM expenses e
      JOIN accounting_journal_entries j ON j.source_expense_id = e.id
      JOIN accounting_accounts a ON a.code = CASE e.payment_method
        WHEN 'CASH' THEN 'CASH'
        WHEN 'BANK' THEN 'BANK'
        WHEN 'MOBILE' THEN 'MOBILE_WALLET'
        WHEN 'CARD' THEN 'CARD_PAYABLE'
        ELSE 'OTHER_PAYABLE'
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE line FROM accounting_journal_lines line
      JOIN accounting_journal_entries entry ON entry.id = line.entry_id
      WHERE entry.entry_type = 'EXPENSE_PAYMENT'
    `);
    await queryRunner.query(
      `DELETE FROM accounting_journal_entries WHERE entry_type = 'EXPENSE_PAYMENT'`,
    );
    await queryRunner.query(`
      ALTER TABLE accounting_journal_entries
      DROP FOREIGN KEY fk_accounting_journal_entries_expense,
      DROP INDEX uq_accounting_journal_entries_source_expense,
      DROP COLUMN source_expense_id,
      MODIFY entry_type ENUM('OWNER_CONTRIBUTION', 'OWNER_WITHDRAWAL', 'CASH_BANK_TRANSFER') NOT NULL
    `);
    await queryRunner.query(`
      DELETE FROM accounting_accounts
      WHERE code IN (
        'MOBILE_WALLET', 'CARD_PAYABLE', 'OTHER_PAYABLE',
        'EXPENSE_ELECTRICITY', 'EXPENSE_WATER', 'EXPENSE_INTERNET', 'EXPENSE_RENT',
        'EXPENSE_MAINTENANCE', 'EXPENSE_CLEANING', 'EXPENSE_STATIONERY',
        'EXPENSE_TRANSPORTATION', 'EXPENSE_MARKETING', 'EXPENSE_EQUIPMENT', 'EXPENSE_MISC'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE accounting_accounts
      MODIFY type ENUM('ASSET', 'EQUITY', 'CONTRA_EQUITY') NOT NULL
    `);
  }
}
