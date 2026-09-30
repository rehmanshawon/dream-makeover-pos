import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { CustomerRewardTier } from '../customers/customer-reward-tier.enum';
import { bigintTransformer } from '../common/transformers/bigint.transformer';

export interface LoyaltyTierSetting {
  tier: CustomerRewardTier;
  minimumPoints: number;
  redeemPoints: number;
  discountMinor: number;
}

@Entity('loyalty_settings')
export class LoyaltySettings {
  @PrimaryColumn({ type: 'tinyint', unsigned: true })
  id: number = 1;

  @Column({
    name: 'earning_spend_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  earningSpendMinor: number;

  @Column({ name: 'earning_points', type: 'int', unsigned: true })
  earningPoints: number;

  @Column({ name: 'tier_settings', type: 'json' })
  tiers: LoyaltyTierSetting[];

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
