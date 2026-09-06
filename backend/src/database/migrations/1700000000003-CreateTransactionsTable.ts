import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTransactionsTable1700000000003 implements MigrationInterface {
  name = 'CreateTransactionsTable1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE transactions (
        id CHAR(36) PRIMARY KEY,
        invoice_id VARCHAR(40) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        customer_id CHAR(36) NULL,
        subtotal_minor BIGINT UNSIGNED NOT NULL,
        discount_minor BIGINT UNSIGNED NOT NULL DEFAULT 0,
        total_minor BIGINT UNSIGNED NOT NULL,
        cash_received_minor BIGINT UNSIGNED NOT NULL,
        change_minor BIGINT UNSIGNED NOT NULL,
        cashier VARCHAR(100) NOT NULL,
        UNIQUE KEY uq_transactions_invoice (invoice_id),
        INDEX idx_transactions_customer (customer_id),
        CONSTRAINT fk_transactions_customer
          FOREIGN KEY (customer_id)
          REFERENCES customers(id)
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE transactions`);
  }
}
