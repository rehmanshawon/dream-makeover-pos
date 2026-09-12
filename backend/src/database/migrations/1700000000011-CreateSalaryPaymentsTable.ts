import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSalaryPaymentsTable1700000000011 implements MigrationInterface {
  name = 'CreateSalaryPaymentsTable1700000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE salary_payments (
        id CHAR(36) PRIMARY KEY,
        employee_id CHAR(36) NOT NULL,
        amount_minor BIGINT UNSIGNED NOT NULL,
        payment_type ENUM('REGULAR', 'BONUS', 'OVERTIME', 'ADVANCE') NOT NULL DEFAULT 'REGULAR',
        payment_method ENUM('CASH', 'BANK', 'MOBILE') NOT NULL DEFAULT 'CASH',
        paid_on DATE NOT NULL,
        note VARCHAR(255) NULL,
        paid_by VARCHAR(80) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_salary_payments_employee (employee_id),
        INDEX idx_salary_payments_paid_on (paid_on),
        CONSTRAINT fk_salary_payments_employee
          FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE salary_payments');
  }
}
