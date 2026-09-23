import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplacePayPeriodsWithYearMonth1700000000020 implements MigrationInterface {
  name = 'ReplacePayPeriodsWithYearMonth1700000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE pay_periods ADD COLUMN year INT UNSIGNED NULL AFTER id');
    await queryRunner.query(
      'ALTER TABLE pay_periods ADD COLUMN month TINYINT UNSIGNED NULL AFTER year',
    );

    await queryRunner.query(`
      UPDATE pay_periods
        SET year = YEAR(start_date),
            month = MONTH(start_date)
    `);

    await queryRunner.query('ALTER TABLE pay_periods MODIFY COLUMN year INT UNSIGNED NOT NULL');
    await queryRunner.query(
      'ALTER TABLE pay_periods MODIFY COLUMN month TINYINT UNSIGNED NOT NULL',
    );

    await queryRunner.query(
      'ALTER TABLE pay_periods ADD UNIQUE KEY uq_pay_periods_year_month (year, month)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE pay_periods DROP INDEX uq_pay_periods_year_month');
    await queryRunner.query('ALTER TABLE pay_periods DROP COLUMN month');
    await queryRunner.query('ALTER TABLE pay_periods DROP COLUMN year');
  }
}
