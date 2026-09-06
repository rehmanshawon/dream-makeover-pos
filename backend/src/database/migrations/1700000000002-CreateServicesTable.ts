import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateServicesTable1700000000002 implements MigrationInterface {
  name = 'CreateServicesTable1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE services (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        price_minor BIGINT UNSIGNED NOT NULL,
        duration_minutes INT UNSIGNED NOT NULL,
        reward_point_weight INT UNSIGNED NOT NULL DEFAULT 1,
        active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE services`);
  }
}
