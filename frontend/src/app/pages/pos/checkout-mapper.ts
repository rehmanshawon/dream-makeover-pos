import type { CartItem, CartTotals } from './use-cart';
import type { CheckoutRequest } from '../../../types/checkout';

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
): CheckoutRequest {
  const request: CheckoutRequest = {
    items: items.map((item) => ({
      itemType: item.kind,
      itemId: item.id,
      quantity: item.quantity,
    })),
    discountMinor: totals.discountMinor,
    vatRatePercent: totals.vatRatePercent,
    cashReceivedMinor: totals.cashReceivedMinor,
  };

  if (customerId) {
    request.customerId = customerId;
  }

  return request;
}
