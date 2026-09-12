import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmployeesTable1700000000010 implements MigrationInterface {
  name = 'CreateEmployeesTable1700000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE employees (
        id CHAR(36) PRIMARY KEY,
        full_name VARCHAR(150) NOT NULL,
        role VARCHAR(100) NOT NULL,
        salary_minor BIGINT UNSIGNED NOT NULL,
        salary_frequency ENUM('MONTHLY', 'WEEKLY', 'DAILY') NOT NULL,
        join_date DATE NOT NULL,
        status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
        phone VARCHAR(30) NULL,
        note TEXT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX idx_employees_full_name (full_name),
        INDEX idx_employees_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE employees');
  }
}
