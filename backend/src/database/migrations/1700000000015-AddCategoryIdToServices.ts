import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryIdToServices1700000000015 implements MigrationInterface {
  name = 'AddCategoryIdToServices1700000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE services ADD COLUMN category_id CHAR(36) NULL AFTER name');

    // All existing services belong to the seeded "Services" category.
    await queryRunner.query(`
      UPDATE services
        SET category_id = (
          SELECT id FROM categories
           WHERE kind = 'SERVICE' AND slug = 'services'
           LIMIT 1
        )
    `);

    await queryRunner.query('ALTER TABLE services MODIFY COLUMN category_id CHAR(36) NOT NULL');

    await queryRunner.query('ALTER TABLE services ADD INDEX idx_services_category (category_id)');

    await queryRunner.query(`
      ALTER TABLE services
        ADD CONSTRAINT fk_services_category
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE services DROP FOREIGN KEY fk_services_category');
    await queryRunner.query('ALTER TABLE services DROP INDEX idx_services_category');
    await queryRunner.query('ALTER TABLE services DROP COLUMN category_id');
  }
}
