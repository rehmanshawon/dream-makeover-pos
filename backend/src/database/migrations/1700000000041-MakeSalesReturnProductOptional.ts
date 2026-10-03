import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeSalesReturnProductOptional1700000000041 implements MigrationInterface {
  name = 'MakeSalesReturnProductOptional1700000000041';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sales_return_lines
      MODIFY product_id CHAR(36) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sales_return_lines
      MODIFY product_id CHAR(36) NOT NULL
    `);
  }
}