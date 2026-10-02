import type { CartItem, CartTotals } from './use-cart';
import type {
  CheckoutRequest,
  MobileWalletProvider,
  SalePaymentMethod,
} from '../../../types/checkout';

/**
 * Converts the cart state into a CheckoutRequest.
 *
 * Prices are NOT sent. The backend re-fetches each item's current price
 * to prevent clients from manipulating financial values.
 */
export function buildCheckoutRequest(
  items: CartItem[],
  totals: CartTotals,
  customerId: string | null,
  payment: {
    paymentMethod: SalePaymentMethod;
    mobileWalletProvider: MobileWalletProvider | null;
    paymentReference: string;
  } = { paymentMethod: 'CASH', mobileWalletProvider: null, paymentReference: '' },
): CheckoutRequest {
  const isCash = payment.paymentMethod === 'CASH';
  const request: CheckoutRequest = {
    items: items.map((item) => ({
      itemType: item.kind,
      itemId: item.id,
      quantity: item.quantity,
    })),
    discountMinor: totals.discountMinor,
    cashReceivedMinor: isCash ? totals.cashReceivedMinor : totals.totalMinor,
    paymentMethod: payment.paymentMethod,
  };

  if (payment.paymentMethod === 'MOBILE' && payment.mobileWalletProvider) {
    request.mobileWalletProvider = payment.mobileWalletProvider;
  }
  const paymentReference = payment.paymentReference.trim();
  if (paymentReference) request.paymentReference = paymentReference;

  if (totals.redeemRewardPoints) request.redeemRewardPoints = true;

  if (customerId) {
    request.customerId = customerId;
  }

  return request;
}
