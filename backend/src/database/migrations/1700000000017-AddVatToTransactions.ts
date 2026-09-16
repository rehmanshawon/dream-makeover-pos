import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVatToTransactions1700000000017 implements MigrationInterface {
  name = 'AddVatToTransactions1700000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE transactions
      ADD COLUMN vat_rate_percent DECIMAL(5, 2) UNSIGNED NOT NULL DEFAULT 0 AFTER discount_minor,
      ADD COLUMN vat_minor BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER vat_rate_percent
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE transactions
      DROP COLUMN vat_minor,
      DROP COLUMN vat_rate_percent
    `);
  }
}
