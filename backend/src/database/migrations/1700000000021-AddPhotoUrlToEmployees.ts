import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhotoUrlToEmployees1700000000021 implements MigrationInterface {
  name = 'AddPhotoUrlToEmployees1700000000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE employees
        ADD COLUMN photo_url VARCHAR(500) NULL AFTER note
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE employees DROP COLUMN photo_url');
  }
}
