import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdvanceAdjustmentPaymentType1700000000023 implements MigrationInterface {
  name = 'AddAdvanceAdjustmentPaymentType1700000000023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE salary_payments
      MODIFY COLUMN payment_type ENUM('REGULAR', 'BONUS', 'OVERTIME', 'ADVANCE', 'ADVANCE_ADJUSTMENT')
      NOT NULL DEFAULT 'REGULAR'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE salary_payments
      MODIFY COLUMN payment_type ENUM('REGULAR', 'BONUS', 'OVERTIME', 'ADVANCE')
      NOT NULL DEFAULT 'REGULAR'
    `);
  }
}
