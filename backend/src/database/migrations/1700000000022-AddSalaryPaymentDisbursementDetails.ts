import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSalaryPaymentDisbursementDetails1700000000022 implements MigrationInterface {
  name = 'AddSalaryPaymentDisbursementDetails1700000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE salary_payments
        ADD COLUMN check_number VARCHAR(80) NULL AFTER note,
        ADD COLUMN bank_account_number VARCHAR(120) NULL AFTER check_number,
        ADD COLUMN mobile_wallet_provider VARCHAR(20) NULL AFTER bank_account_number,
        ADD COLUMN mobile_wallet_number VARCHAR(30) NULL AFTER mobile_wallet_provider
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE salary_payments
        DROP COLUMN mobile_wallet_number,
        DROP COLUMN mobile_wallet_provider,
        DROP COLUMN bank_account_number,
        DROP COLUMN check_number
    `);
  }
}
