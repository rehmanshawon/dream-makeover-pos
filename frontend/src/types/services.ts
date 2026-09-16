export interface SalonService {
  id: string;
  name: string;
  categoryId: string;
  category: string;
  priceMinor: number;
  durationMinutes: number;
  rewardPointWeight: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceRequest {
  name: string;
  categoryId?: string;
  priceMinor: number;
  durationMinutes: number;
  rewardPointWeight: number;
  active?: boolean;
}

export interface UpdateServiceRequest {
  name?: string;
  categoryId?: string;
  priceMinor?: number;
  durationMinutes?: number;
  rewardPointWeight?: number;
  active?: boolean;
}
