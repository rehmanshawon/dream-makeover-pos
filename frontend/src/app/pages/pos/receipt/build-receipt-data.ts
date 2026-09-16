import type { CheckoutResponse } from '../../../../types/checkout';
import type { BusinessInfo } from '../../../../config/business';
import type { ReceiptData } from './receipt-types';

/**
 * Transforms a checkout response and business info into a ReceiptData
 * object ready for formatting.
 *
 * The checkout response contains everything needed. The cart state is
 * not consulted, which keeps the receipt correct even after the cart is
 * cleared.
 */
export function buildReceiptData(response: CheckoutResponse, business: BusinessInfo): ReceiptData {
  return {
    invoiceId: response.invoiceId,
    createdAt: new Date().toISOString(),
    cashier: response.cashier,
    customer: response.customer
      ? {
          name: response.customer.name,
          phone: response.customer.phoneNumber,
          tier: response.customer.tier,
          totalPoints: response.customer.totalPointsAfterSale,
        }
      : null,
    items: response.items.map((item) => ({
      name: item.itemName,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      totalPriceMinor: item.totalPriceMinor,
    })),
    subtotalMinor: response.subtotalMinor,
    discountMinor: response.discountMinor,
    vatRatePercent: response.vatRatePercent ?? 0,
    vatMinor: response.vatMinor ?? 0,
    totalMinor: response.totalMinor,
    cashReceivedMinor: response.cashReceivedMinor,
    changeMinor: response.changeMinor,
    loyalty:
      response.customer && response.loyaltyPointsEarned > 0
        ? {
            pointsEarned: response.loyaltyPointsEarned,
            totalPoints: response.customer.totalPointsAfterSale,
            tier: response.customer.tier,
          }
        : null,
    business: {
      name: business.name,
      tagline: business.tagline,
      addressLines: business.addressLines,
      phone: business.phone,
    },
  };
}
