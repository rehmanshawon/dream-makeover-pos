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
  vatRatePercent: number;
  cashReceivedMinor: number;
}

export interface CheckoutResponseItem {
  itemType: string;
  itemName: string;
  quantity: number;
  unitPriceMinor: number;
  totalPriceMinor: number;
}

export interface CheckoutCustomer {
  id: string;
  name: string;
  phoneNumber: string;
  tier: string;
  totalPointsAfterSale: number;
  lifetimeSpendMinorAfterSale: number;
}

export interface CheckoutResponse {
  transactionId: string;
  invoiceId: string;
  subtotalMinor: number;
  discountMinor: number;
  vatRatePercent: number;
  vatMinor: number;
  totalMinor: number;
  cashReceivedMinor: number;
  changeMinor: number;
  cashier: string;
  items: CheckoutResponseItem[];
  loyaltyPointsEarned: number;
  customer: CheckoutCustomer | null;
}
