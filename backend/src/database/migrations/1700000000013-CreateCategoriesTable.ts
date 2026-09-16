import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCategoriesTable1700000000013 implements MigrationInterface {
  name = 'CreateCategoriesTable1700000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE categories (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        slug VARCHAR(150) NOT NULL,
        kind ENUM('SERVICE', 'PRODUCT') NOT NULL,
        parent_id CHAR(36) NULL,
        display_order INT UNSIGNED NOT NULL DEFAULT 0,
        active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_categories_kind_slug (kind, slug),
        INDEX idx_categories_kind (kind),
        INDEX idx_categories_parent (parent_id),
        CONSTRAINT fk_categories_parent
          FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Seed top-level categories matching the previous enum values
    // and a default service category. UUID() lets MySQL generate IDs.
    await queryRunner.query(`
      INSERT INTO categories (id, name, slug, kind, parent_id, display_order, active) VALUES
        (UUID(), 'Cosmetics',   'cosmetics',   'PRODUCT', NULL, 0, 1),
        (UUID(), 'Saree',       'saree',       'PRODUCT', NULL, 1, 1),
        (UUID(), 'Three-piece', 'three-piece', 'PRODUCT', NULL, 2, 1),
        (UUID(), 'Services',    'services',    'SERVICE', NULL, 0, 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE categories');
  }
}
