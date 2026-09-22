import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAttendanceTable1700000000018 implements MigrationInterface {
  name = 'CreateAttendanceTable1700000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE attendance_records (
        id CHAR(36) PRIMARY KEY,
        employee_id CHAR(36) NOT NULL,
        date DATE NOT NULL,
        status ENUM('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE') NOT NULL,
        note VARCHAR(255) NULL,
        recorded_by VARCHAR(80) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_attendance_employee_date (employee_id, date),
        INDEX idx_attendance_employee (employee_id),
        INDEX idx_attendance_date (date),
        CONSTRAINT fk_attendance_employee
          FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE attendance_records');
  }
}
