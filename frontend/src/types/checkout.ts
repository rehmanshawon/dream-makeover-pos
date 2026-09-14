export type CheckoutItemType = 'PRODUCT' | 'SERVICE' | 'PACKAGE';

export interface CheckoutRequestItem {
  itemType: CheckoutItemType;
  itemId: string;
  quantity: number;
}

export interface CheckoutRequest {
  items: CheckoutRequestItem[];
  customerId?: string;
  discountMinor: number;
  cashReceivedMinor: number;
}

export interface CheckoutResponseItem {
  itemType: string;
  itemName: string;
  quantity: number;
  unitPriceMinor: number;
  totalPriceMinor: number;
}

export interface CheckoutResponse {
  transactionId: string;
  invoiceId: string;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  cashReceivedMinor: number;
  changeMinor: number;
  items: CheckoutResponseItem[];
  loyaltyPointsEarned: number;
  newRewardTier?: string;
}
