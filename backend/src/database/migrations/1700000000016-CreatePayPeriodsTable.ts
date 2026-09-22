import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayPeriodsTable1700000000016 implements MigrationInterface {
  name = 'CreatePayPeriodsTable1700000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE pay_periods (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
        closed_at DATETIME NULL,
        closed_by VARCHAR(80) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_pay_periods_name (name),
        INDEX idx_pay_periods_dates (start_date, end_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE pay_periods');
  }
}
