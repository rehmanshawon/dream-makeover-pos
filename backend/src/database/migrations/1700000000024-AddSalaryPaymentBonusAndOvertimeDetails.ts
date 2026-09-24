import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSalaryPaymentBonusAndOvertimeDetails1700000000024 implements MigrationInterface {
  name = 'AddSalaryPaymentBonusAndOvertimeDetails1700000000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE salary_payments
        ADD COLUMN bonus_type VARCHAR(20) NULL AFTER note,
        ADD COLUMN overtime_hours SMALLINT UNSIGNED NULL AFTER bonus_type,
        ADD COLUMN overtime_date DATE NULL AFTER overtime_hours
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE salary_payments
        DROP COLUMN overtime_date,
        DROP COLUMN overtime_hours,
        DROP COLUMN bonus_type
    `);
  }
}
