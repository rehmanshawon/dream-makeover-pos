import { describe, expect, it } from 'vitest';
import { buildCheckoutRequest } from './checkout-mapper';
import type { CartItem, CartTotals } from './use-cart';

const ITEMS: CartItem[] = [
  {
    kind: 'PRODUCT',
    id: 'p1',
    name: 'Lipstick',
    unitPriceMinor: 120000,
    quantity: 2,
  },
  {
    kind: 'SERVICE',
    id: 's1',
    name: 'Facial',
    unitPriceMinor: 200000,
    quantity: 1,
  },
];

const TOTALS: CartTotals = {
  subtotalMinor: 440000,
  discountMinor: 10000,
  totalMinor: 430000,
  cashReceivedMinor: 500000,
  changeMinor: 70000,
  itemCount: 3,
};

describe('buildCheckoutRequest', () => {
  it('maps cart items to checkout items', () => {
    const result = buildCheckoutRequest(ITEMS, TOTALS, null);

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({
      itemType: 'PRODUCT',
      itemId: 'p1',
      quantity: 2,
    });
    expect(result.items[1]).toEqual({
      itemType: 'SERVICE',
      itemId: 's1',
      quantity: 1,
    });
  });

  it('does not include prices in the request', () => {
    const result = buildCheckoutRequest(ITEMS, TOTALS, null);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('unitPriceMinor');
    expect(serialized).not.toContain('120000');
    expect(serialized).not.toContain('name');
  });

  it('includes discount and cash from totals', () => {
    const result = buildCheckoutRequest(ITEMS, TOTALS, null);
    expect(result.discountMinor).toBe(10000);
    expect(result.cashReceivedMinor).toBe(500000);
  });

  it('includes customerId when provided', () => {
    const result = buildCheckoutRequest(ITEMS, TOTALS, 'customer-1');
    expect(result.customerId).toBe('customer-1');
  });

  it('omits customerId when null', () => {
    const result = buildCheckoutRequest(ITEMS, TOTALS, null);
    expect(result.customerId).toBeUndefined();
    expect('customerId' in result).toBe(false);
  });
});
