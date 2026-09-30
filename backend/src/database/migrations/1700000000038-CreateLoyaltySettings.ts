import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLoyaltySettings1700000000038 implements MigrationInterface {
  name = 'CreateLoyaltySettings1700000000038';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE loyalty_settings (
        id TINYINT UNSIGNED NOT NULL,
        earning_spend_minor BIGINT UNSIGNED NOT NULL DEFAULT 10000,
        earning_points INT UNSIGNED NOT NULL DEFAULT 1,
        tier_settings JSON NOT NULL,
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        CONSTRAINT chk_loyalty_settings_singleton CHECK (id = 1)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`
      INSERT INTO loyalty_settings (id, earning_spend_minor, earning_points, tier_settings)
      VALUES (
        1,
        10000,
        1,
        JSON_ARRAY(
          JSON_OBJECT('tier', 'Silver', 'minimumPoints', 0, 'redeemPoints', 0, 'discountMinor', 0),
          JSON_OBJECT('tier', 'Gold', 'minimumPoints', 200, 'redeemPoints', 0, 'discountMinor', 0),
          JSON_OBJECT('tier', 'Platinum', 'minimumPoints', 500, 'redeemPoints', 0, 'discountMinor', 0),
          JSON_OBJECT('tier', 'Diamond', 'minimumPoints', 1000, 'redeemPoints', 0, 'discountMinor', 0)
        )
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE loyalty_settings');
  }
}
