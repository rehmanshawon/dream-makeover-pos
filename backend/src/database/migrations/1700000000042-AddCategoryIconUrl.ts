import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryIconUrl1700000000042 implements MigrationInterface {
  name = 'AddCategoryIconUrl1700000000042';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE categories
      ADD COLUMN icon_url VARCHAR(255) NULL AFTER parent_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE categories DROP COLUMN icon_url');
  }
}