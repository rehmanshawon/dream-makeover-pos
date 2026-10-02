export type CheckoutItemType = 'PRODUCT' | 'SERVICE' | 'PACKAGE';
export type SalePaymentMethod = 'CASH' | 'CARD' | 'BANK' | 'MOBILE';
export type MobileWalletProvider = 'BKASH' | 'ROCKET' | 'NAGAD' | 'OTHER';

export interface CheckoutRequestItem {
  itemType: CheckoutItemType;
  itemId: string;
  quantity: number;
}

export interface CheckoutRequest {
  items: CheckoutRequestItem[];
  customerId?: string;
  redeemRewardPoints?: boolean;
  discountMinor: number;
  cashReceivedMinor: number;
  paymentMethod: SalePaymentMethod;
  mobileWalletProvider?: MobileWalletProvider;
  paymentReference?: string;
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
  manualDiscountMinor: number;
  rewardDiscountMinor: number;
  discountMinor: number;
  totalMinor: number;
  cashReceivedMinor: number;
  changeMinor: number;
  paymentMethod: SalePaymentMethod;
  mobileWalletProvider: MobileWalletProvider | null;
  paymentReference: string | null;
  cashier: string;
  items: CheckoutResponseItem[];
  loyaltyPointsEarned: number;
  rewardPointsRedeemed: number;
  customer: CheckoutCustomer | null;
}
