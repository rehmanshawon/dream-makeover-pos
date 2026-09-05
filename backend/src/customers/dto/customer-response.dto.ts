import { CustomerRewardTier } from '../customer-reward-tier.enum';

export class CustomerResponseDto {
  id: string;
  fullName: string;
  phoneNumber: string;
  rewardTier: CustomerRewardTier;
  rewardPoints: number;
  lifetimeSpendMinor: number;
  createdAt: Date;
  updatedAt: Date;
}
