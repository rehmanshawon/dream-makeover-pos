export class ServiceResponseDto {
  id: string;
  name: string;
  categoryId: string;
  category: string;
  priceMinor: number;
  durationMinutes: number;
  rewardPointWeight: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
