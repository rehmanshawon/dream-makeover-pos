import { describe, expect, it } from 'vitest';
import { buildReceiptData } from './build-receipt-data';
import type { CheckoutResponse } from '../../../../types/checkout';

const BUSINESS = {
  name: 'DREAM MAKEOVER',
  tagline: 'A Luxury Beauty Salon',
  addressLines: ['123 Test Road'],
  phone: '+880 1XXX-XXXXXX',
  website: '',
  email: '',
};

function baseResponse(overrides: Partial<CheckoutResponse> = {}): CheckoutResponse {
  return {
    transactionId: 'tx-1',
    invoiceId: 'DM-20260915-0001',
    subtotalMinor: 200000,
    discountMinor: 0,
    vatRatePercent: 0,
    vatMinor: 0,
    totalMinor: 200000,
    cashReceivedMinor: 300000,
    changeMinor: 100000,
    cashier: 'admin',
    items: [
      {
        itemType: 'SERVICE',
        itemName: 'Facial',
        quantity: 1,
        unitPriceMinor: 200000,
        totalPriceMinor: 200000,
      },
    ],
    loyaltyPointsEarned: 0,
    customer: null,
    ...overrides,
  };
}

describe('buildReceiptData', () => {
  it('maps the checkout response into a receipt', () => {
    const receipt = buildReceiptData(baseResponse(), BUSINESS);

    expect(receipt.invoiceId).toBe('DM-20260915-0001');
    expect(receipt.cashier).toBe('admin');
    expect(receipt.items).toHaveLength(1);
    expect(receipt.items[0]!.name).toBe('Facial');
    expect(receipt.totalMinor).toBe(200000);
  });

  it('sets customer to null for guest sales', () => {
    const receipt = buildReceiptData(baseResponse({ customer: null }), BUSINESS);
    expect(receipt.customer).toBeNull();
    expect(receipt.loyalty).toBeNull();
  });

  it('includes customer and loyalty when a customer is attached', () => {
    const receipt = buildReceiptData(
      baseResponse({
        customer: {
          id: 'c1',
          name: 'Alice Rahman',
          phoneNumber: '01700000000',
          tier: 'Gold',
          totalPointsAfterSale: 250,
          lifetimeSpendMinorAfterSale: 500000,
        },
        loyaltyPointsEarned: 20,
      }),
      BUSINESS,
    );

    expect(receipt.customer).not.toBeNull();
    expect(receipt.customer?.name).toBe('Alice Rahman');
    expect(receipt.customer?.tier).toBe('Gold');
    expect(receipt.customer?.totalPoints).toBe(250);
    expect(receipt.loyalty?.pointsEarned).toBe(20);
    expect(receipt.loyalty?.totalPoints).toBe(250);
  });

  it('omits the loyalty section when no points were earned', () => {
    const receipt = buildReceiptData(
      baseResponse({
        customer: {
          id: 'c1',
          name: 'Alice',
          phoneNumber: '01700000000',
          tier: 'Silver',
          totalPointsAfterSale: 5,
          lifetimeSpendMinorAfterSale: 5000,
        },
        loyaltyPointsEarned: 0,
      }),
      BUSINESS,
    );
    expect(receipt.customer).not.toBeNull();
    expect(receipt.loyalty).toBeNull();
  });

  it('copies business info from the config', () => {
    const receipt = buildReceiptData(baseResponse(), BUSINESS);
    expect(receipt.business.name).toBe('DREAM MAKEOVER');
    expect(receipt.business.addressLines).toEqual(['123 Test Road']);
  });
});
