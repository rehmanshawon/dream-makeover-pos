import { SalePaymentMethod } from '../../sale-payment-method.enum';
import { MobileWalletProvider } from '../../mobile-wallet-provider.enum';

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
  phoneNumber: string;
  tier: string;
  totalPointsAfterSale: number;
  lifetimeSpendMinorAfterSale: number;
}

export class CheckoutResponseDto {
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
  items: CheckoutItemResponseDto[];
  loyaltyPointsEarned: number;
  rewardPointsRedeemed: number;
  /**
   * Null for guest sales (no customer attached).
   */
  customer: CheckoutCustomerResponseDto | null;
}
