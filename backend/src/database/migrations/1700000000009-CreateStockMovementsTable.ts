import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStockMovementsTable1700000000009 implements MigrationInterface {
  name = 'CreateStockMovementsTable1700000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE stock_movements (
        id CHAR(36) PRIMARY KEY,
        product_id CHAR(36) NOT NULL,
        delta INT NOT NULL,
        reason ENUM('SALE', 'STOCK_IN', 'ADJUSTMENT', 'RETURN') NOT NULL,
        reference_id CHAR(36) NULL,
        note VARCHAR(255) NULL,
        created_by VARCHAR(80) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_stock_movements_product (product_id),
        INDEX idx_stock_movements_reason (reason),
        INDEX idx_stock_movements_created_at (created_at),
        CONSTRAINT fk_stock_movements_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE stock_movements');
  }
}
