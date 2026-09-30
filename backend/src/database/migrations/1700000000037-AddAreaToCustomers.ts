import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAreaToCustomers1700000000037 implements MigrationInterface {
  name = 'AddAreaToCustomers1700000000037';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE customers ADD COLUMN area VARCHAR(150) NULL AFTER phone_number`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE customers DROP COLUMN area`);
  }
}
