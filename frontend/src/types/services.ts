export interface SalonService {
  id: string;
  name: string;
  priceMinor: number;
  durationMinutes: number;
  rewardPointWeight: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceRequest {
  name: string;
  priceMinor: number;
  durationMinutes: number;
  rewardPointWeight: number;
  active?: boolean;
}
