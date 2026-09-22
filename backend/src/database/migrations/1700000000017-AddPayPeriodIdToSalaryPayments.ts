import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPayPeriodIdToSalaryPayments1700000000017 implements MigrationInterface {
  name = 'AddPayPeriodIdToSalaryPayments1700000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE salary_payments ADD COLUMN pay_period_id CHAR(36) NULL AFTER employee_id',
    );
    await queryRunner.query(
      'ALTER TABLE salary_payments ADD INDEX idx_salary_payments_period (pay_period_id)',
    );
    await queryRunner.query(`
      ALTER TABLE salary_payments
        ADD CONSTRAINT fk_salary_payments_period
        FOREIGN KEY (pay_period_id) REFERENCES pay_periods(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE salary_payments DROP FOREIGN KEY fk_salary_payments_period',
    );
    await queryRunner.query('ALTER TABLE salary_payments DROP INDEX idx_salary_payments_period');
    await queryRunner.query('ALTER TABLE salary_payments DROP COLUMN pay_period_id');
  }
}
