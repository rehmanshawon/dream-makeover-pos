export type LoyaltyTierName = 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

export interface LoyaltyTierSetting {
  tier: LoyaltyTierName;
  minimumPoints: number;
  redeemPoints: number;
  discountMinor: number;
}

export interface LoyaltySettings {
  id: number;
  earningSpendMinor: number;
  earningPoints: number;
  tiers: LoyaltyTierSetting[];
  updatedAt: string;
}

export type UpdateLoyaltySettingsRequest = Omit<LoyaltySettings, 'id' | 'updatedAt'>;
