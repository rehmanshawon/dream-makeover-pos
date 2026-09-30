import { MigrationInterface, QueryRunner } from 'typeorm';

export class TrackLoyaltyTransactions1700000000039 implements MigrationInterface {
  name = 'TrackLoyaltyTransactions1700000000039';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE transactions
        ADD COLUMN reward_discount_minor BIGINT UNSIGNED NOT NULL DEFAULT 0,
        ADD COLUMN reward_points_redeemed INT UNSIGNED NOT NULL DEFAULT 0,
        ADD COLUMN loyalty_points_earned INT UNSIGNED NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      UPDATE transactions
      SET loyalty_points_earned = FLOOR(total_minor / 10000)
      WHERE customer_id IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE sales_returns
        ADD COLUMN reward_points_removed INT UNSIGNED NOT NULL DEFAULT 0,
        ADD COLUMN reward_points_restored INT UNSIGNED NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      UPDATE sales_returns
      SET reward_points_removed = FLOOR(refund_minor / 10000)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sales_returns
        DROP COLUMN reward_points_removed,
        DROP COLUMN reward_points_restored
    `);
    await queryRunner.query(`
      ALTER TABLE transactions
        DROP COLUMN reward_discount_minor,
        DROP COLUMN reward_points_redeemed,
        DROP COLUMN loyalty_points_earned
    `);
  }
}
