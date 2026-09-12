export class RevenueTrendPointDto {
  date: string;
  revenueMinor: number;
  transactionCount: number;
}

export class RevenueTrendResponseDto {
  from: string;
  to: string;
  points: RevenueTrendPointDto[];
}
