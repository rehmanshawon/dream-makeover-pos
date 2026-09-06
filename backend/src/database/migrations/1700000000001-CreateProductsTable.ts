import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductsTable1700000000001 implements MigrationInterface {
  name = 'CreateProductsTable1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE products (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        category ENUM('Cosmetics', 'Saree', 'Three-piece') NOT NULL,
        stock INT UNSIGNED NOT NULL DEFAULT 0,
        purchase_cost_minor BIGINT UNSIGNED NOT NULL DEFAULT 0,
        selling_price_minor BIGINT UNSIGNED NOT NULL,
        minimum_stock_threshold INT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX idx_products_category (category)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE products`);
  }
}
