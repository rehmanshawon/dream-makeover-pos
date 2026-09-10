import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTransactionItemsTable1700000000005 implements MigrationInterface {
  name = 'CreateTransactionItemsTable1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE transaction_items (
        id CHAR(36) PRIMARY KEY,
        transaction_id CHAR(36) NOT NULL,
        product_id CHAR(36) NULL,
        service_id CHAR(36) NULL,
        item_type ENUM('PRODUCT', 'SERVICE') NOT NULL,
        item_name VARCHAR(150) NOT NULL,
        quantity INT UNSIGNED NOT NULL,
        unit_price_minor BIGINT UNSIGNED NOT NULL,
        total_price_minor BIGINT UNSIGNED NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_transaction_items_transaction (transaction_id),
        INDEX idx_transaction_items_product (product_id),
        INDEX idx_transaction_items_service (service_id),
        CONSTRAINT fk_transaction_items_transaction
          FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
        CONSTRAINT fk_transaction_items_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
        CONSTRAINT fk_transaction_items_service
          FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE transaction_items`);
  }
}
