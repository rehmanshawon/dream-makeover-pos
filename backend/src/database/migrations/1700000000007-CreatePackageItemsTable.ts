import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePackageItemsTable1700000000007 implements MigrationInterface {
  name = 'CreatePackageItemsTable1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE package_items (
        id CHAR(36) PRIMARY KEY,
        package_id CHAR(36) NOT NULL,
        item_kind ENUM('SERVICE', 'PRODUCT') NOT NULL,
        service_id CHAR(36) NULL,
        product_id CHAR(36) NULL,
        snapshot_price_minor BIGINT UNSIGNED NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_package_items_package (package_id),
        INDEX idx_package_items_service (service_id),
        INDEX idx_package_items_product (product_id),
        CONSTRAINT fk_package_items_package
          FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
        CONSTRAINT fk_package_items_service
          FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
        CONSTRAINT fk_package_items_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
        CONSTRAINT chk_package_items_kind CHECK (
          (item_kind = 'SERVICE' AND service_id IS NOT NULL AND product_id IS NULL)
          OR
          (item_kind = 'PRODUCT' AND product_id IS NOT NULL AND service_id IS NULL)
        )
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE package_items');
  }
}
