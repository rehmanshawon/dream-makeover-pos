import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExpensesTable1700000000012 implements MigrationInterface {
  name = 'CreateExpensesTable1700000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE expenses (
        id CHAR(36) PRIMARY KEY,
        category ENUM(
          'ELECTRICITY', 'WATER', 'INTERNET', 'RENT', 'MAINTENANCE',
          'CLEANING', 'STATIONERY', 'TRANSPORTATION', 'MARKETING',
          'EQUIPMENT', 'MISC'
        ) NOT NULL,
        amount_minor BIGINT UNSIGNED NOT NULL,
        expense_date DATE NOT NULL,
        payment_method ENUM('CASH', 'BANK', 'MOBILE', 'CARD', 'OTHER') NOT NULL DEFAULT 'CASH',
        payee VARCHAR(150) NULL,
        reference VARCHAR(100) NULL,
        note VARCHAR(255) NULL,
        created_by VARCHAR(80) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX idx_expenses_category (category),
        INDEX idx_expenses_expense_date (expense_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE expenses');
  }
}
