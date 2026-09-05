import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomersTable1700000000000 implements MigrationInterface {
  name = 'CreateCustomersTable1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE customers (
        id CHAR(36) PRIMARY KEY,
        full_name VARCHAR(150) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        reward_tier ENUM('Silver', 'Gold', 'Platinum', 'Diamond') NOT NULL DEFAULT 'Silver',
        reward_points INT UNSIGNED NOT NULL DEFAULT 0,
        lifetime_spend_minor BIGINT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_customers_phone (phone_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE customers`);
  }
}
