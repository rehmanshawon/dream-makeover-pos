import { MigrationInterface, QueryRunner } from 'typeorm';

export class PostPayrollPaymentsToAccounting1700000000031 implements MigrationInterface {
  name = 'PostPayrollPaymentsToAccounting1700000000031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE accounting_journal_entries
      MODIFY entry_type ENUM(
        'OWNER_CONTRIBUTION', 'OWNER_WITHDRAWAL', 'CASH_BANK_TRANSFER',
        'EXPENSE_PAYMENT', 'SALE_RECEIPT', 'PURCHASE', 'SUPPLIER_PAYMENT',
        'OPENING_BALANCE', 'SALARY_PAYMENT'
      ) NOT NULL,
      ADD COLUMN source_salary_payment_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
      ADD UNIQUE KEY uq_accounting_journal_entries_source_salary_payment (source_salary_payment_id),
      ADD CONSTRAINT fk_accounting_journal_entries_salary_payment
        FOREIGN KEY (source_salary_payment_id) REFERENCES salary_payments(id) ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO accounting_accounts (id, code, name, type, is_system) VALUES
        ('00000000-0000-4000-8000-000000000025', 'PAYROLL_EXPENSE', 'Payroll expense', 'EXPENSE', 1),
        ('00000000-0000-4000-8000-000000000026', 'EMPLOYEE_ADVANCES', 'Employee advances', 'ASSET', 1)
    `);
    await queryRunner.query(`
      INSERT INTO accounting_journal_entries
        (id, entry_type, entry_date, memo, reference, created_by, created_at, source_salary_payment_id)
      SELECT UUID(), 'SALARY_PAYMENT', payment.paid_on,
        CONCAT(REPLACE(payment.payment_type, '_', ' '), ' - ', employee.full_name),
        payment.id, payment.paid_by, payment.created_at, payment.id
      FROM salary_payments payment
      INNER JOIN employees employee ON employee.id = payment.employee_id
    `);
    await queryRunner.query(`
      INSERT INTO accounting_journal_lines (id, entry_id, account_id, debit_minor, credit_minor)
      SELECT UUID(), entry.id, debit_account.id, payment.amount_minor, 0
      FROM salary_payments payment
      INNER JOIN accounting_journal_entries entry ON entry.source_salary_payment_id = payment.id
      INNER JOIN accounting_accounts debit_account
        ON debit_account.code = CASE
          WHEN payment.payment_type = 'ADVANCE' THEN 'EMPLOYEE_ADVANCES'
          ELSE 'PAYROLL_EXPENSE'
        END
      UNION ALL
      SELECT UUID(), entry.id, credit_account.id, 0, payment.amount_minor
      FROM salary_payments payment
      INNER JOIN accounting_journal_entries entry ON entry.source_salary_payment_id = payment.id
      INNER JOIN accounting_accounts credit_account
        ON credit_account.code = CASE
          WHEN payment.payment_type = 'ADVANCE_ADJUSTMENT' THEN 'EMPLOYEE_ADVANCES'
          WHEN payment.payment_method = 'BANK' THEN 'BANK'
          WHEN payment.payment_method = 'MOBILE' THEN 'MOBILE_WALLET'
          ELSE 'CASH'
        END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE line FROM accounting_journal_lines line
      INNER JOIN accounting_journal_entries entry ON entry.id = line.entry_id
      WHERE entry.source_salary_payment_id IS NOT NULL
    `);
    await queryRunner.query(`
      DELETE FROM accounting_journal_entries WHERE source_salary_payment_id IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE accounting_journal_entries
      DROP FOREIGN KEY fk_accounting_journal_entries_salary_payment,
      DROP INDEX uq_accounting_journal_entries_source_salary_payment,
      DROP COLUMN source_salary_payment_id,
      MODIFY entry_type ENUM(
        'OWNER_CONTRIBUTION', 'OWNER_WITHDRAWAL', 'CASH_BANK_TRANSFER',
        'EXPENSE_PAYMENT', 'SALE_RECEIPT', 'PURCHASE', 'SUPPLIER_PAYMENT', 'OPENING_BALANCE'
      ) NOT NULL
    `);
    await queryRunner.query(
      `DELETE FROM accounting_accounts WHERE code IN ('PAYROLL_EXPENSE', 'EMPLOYEE_ADVANCES')`,
    );
  }
}
