export type CustomerRewardTier = 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

export interface Customer {
  id: string;
  fullName: string;
  phoneNumber: string;
  rewardTier: CustomerRewardTier;
  rewardPoints: number;
  lifetimeSpendMinor: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerRequest {
  fullName: string;
  phoneNumber: string;
}

export interface UpdateCustomerRequest {
  fullName?: string;
  phoneNumber?: string;
}
