import { IsEnum, IsInt, Min } from 'class-validator';
import { CustomerRewardTier } from '../../customers/customer-reward-tier.enum';

export class LoyaltyTierSettingsDto {
  @IsEnum(CustomerRewardTier)
  tier: CustomerRewardTier;

  @IsInt()
  @Min(0)
  minimumPoints: number;

  @IsInt()
  @Min(0)
  redeemPoints: number;

  @IsInt()
  @Min(0)
  discountMinor: number;
}
