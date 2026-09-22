import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDefaultPaymentMethodToEmployees1700000000019 implements MigrationInterface {
  name = 'AddDefaultPaymentMethodToEmployees1700000000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE employees
        ADD COLUMN default_payment_method
        ENUM('CASH', 'BANK', 'MOBILE') NOT NULL DEFAULT 'CASH'
        AFTER salary_frequency
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE employees DROP COLUMN default_payment_method');
  }
}
