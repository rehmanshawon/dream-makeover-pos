import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryIdToProducts1700000000014 implements MigrationInterface {
  name = 'AddCategoryIdToProducts1700000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old index on the enum column.
    await queryRunner.query('ALTER TABLE products DROP INDEX idx_products_category');

    // Add the new nullable column.
    await queryRunner.query('ALTER TABLE products ADD COLUMN category_id CHAR(36) NULL AFTER name');

    // Populate from the enum by matching slugified names.
    await queryRunner.query(`
      UPDATE products p
        JOIN categories c
          ON c.kind = 'PRODUCT'
         AND c.slug = LOWER(REPLACE(p.category, ' ', '-'))
        SET p.category_id = c.id
    `);

    // Enforce NOT NULL. Any row that did not match would fail here,
    // which is the desired safety check.
    await queryRunner.query('ALTER TABLE products MODIFY COLUMN category_id CHAR(36) NOT NULL');

    // New index and FK.
    await queryRunner.query('ALTER TABLE products ADD INDEX idx_products_category (category_id)');
    await queryRunner.query(`
      ALTER TABLE products
        ADD CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    `);

    // Remove the old enum column.
    await queryRunner.query('ALTER TABLE products DROP COLUMN category');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore the enum with a default, then populate from the
    // linked category's slug. This is lossy for slug characters that
    // cannot be represented in the enum, but the seed data round-trips.
    await queryRunner.query(`
      ALTER TABLE products
        ADD COLUMN category ENUM('Cosmetics', 'Saree', 'Three-piece') NOT NULL DEFAULT 'Cosmetics'
    `);
    await queryRunner.query(`
      UPDATE products p
        JOIN categories c ON c.id = p.category_id
        SET p.category = CASE c.slug
          WHEN 'cosmetics'   THEN 'Cosmetics'
          WHEN 'saree'       THEN 'Saree'
          WHEN 'three-piece' THEN 'Three-piece'
          ELSE 'Cosmetics'
        END
    `);
    await queryRunner.query('ALTER TABLE products ADD INDEX idx_products_category (category)');
    await queryRunner.query('ALTER TABLE products DROP FOREIGN KEY fk_products_category');
    await queryRunner.query('ALTER TABLE products DROP INDEX idx_products_category');
    await queryRunner.query('ALTER TABLE products DROP COLUMN category_id');
  }
}
