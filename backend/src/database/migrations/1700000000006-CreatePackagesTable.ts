import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePackagesTable1700000000006 implements MigrationInterface {
  name = 'CreatePackagesTable1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE packages (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        description TEXT NULL,
        normal_price_minor BIGINT UNSIGNED NOT NULL,
        package_price_minor BIGINT UNSIGNED NOT NULL,
        savings_minor BIGINT UNSIGNED NOT NULL,
        active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_packages_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE packages');
  }
}
