import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmployeeIdentityAndAddresses1700000000025 implements MigrationInterface {
  name = 'AddEmployeeIdentityAndAddresses1700000000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE employees
        ADD COLUMN nid_or_birth_certificate VARCHAR(50) NULL AFTER phone,
        ADD COLUMN present_address TEXT NULL AFTER nid_or_birth_certificate,
        ADD COLUMN permanent_address TEXT NULL AFTER present_address
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE employees
        DROP COLUMN permanent_address,
        DROP COLUMN present_address,
        DROP COLUMN nid_or_birth_certificate
    `);
  }
}
