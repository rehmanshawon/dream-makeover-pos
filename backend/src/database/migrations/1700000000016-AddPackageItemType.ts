import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPackageItemType1700000000016 implements MigrationInterface {
  name = 'AddPackageItemType1700000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE transaction_items
      MODIFY COLUMN item_type ENUM('PRODUCT', 'SERVICE', 'PACKAGE') NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE transaction_items
      MODIFY COLUMN item_type ENUM('PRODUCT', 'SERVICE') NOT NULL
    `);
  }
}
