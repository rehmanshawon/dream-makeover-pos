import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1700000000004 implements MigrationInterface {
  name = 'CreateUsersTable1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id CHAR(36) PRIMARY KEY,
        username VARCHAR(80) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(150) NOT NULL,
        role ENUM('ADMIN', 'STAFF') NOT NULL DEFAULT 'STAFF',
        active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_users_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE users`);
  }
}
