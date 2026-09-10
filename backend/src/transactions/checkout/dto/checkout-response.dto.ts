export class CheckoutItemResponseDto {
  itemType: string;
  itemName: string;
  quantity: number;
  unitPriceMinor: number;
  totalPriceMinor: number;
}

export class CheckoutResponseDto {
  transactionId: string;
  invoiceId: string;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  cashReceivedMinor: number;
  changeMinor: number;
  items: CheckoutItemResponseDto[];
  loyaltyPointsEarned: number;
  newRewardTier?: string;
}
