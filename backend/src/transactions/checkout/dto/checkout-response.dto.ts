export class CheckoutItemResponseDto {
  itemType: string;
  itemName: string;
  quantity: number;
  unitPriceMinor: number;
  totalPriceMinor: number;
}

export class CheckoutCustomerResponseDto {
  id: string;
  name: string;
  tier: string;
  totalPointsAfterSale: number;
  lifetimeSpendMinorAfterSale: number;
}

export class CheckoutResponseDto {
  transactionId: string;
  invoiceId: string;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  cashReceivedMinor: number;
  changeMinor: number;
  cashier: string;
  items: CheckoutItemResponseDto[];
  loyaltyPointsEarned: number;
  /**
   * Null for guest sales (no customer attached).
   */
  customer: CheckoutCustomerResponseDto | null;
}
