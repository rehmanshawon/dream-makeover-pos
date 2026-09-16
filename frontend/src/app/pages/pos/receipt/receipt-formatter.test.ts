import { describe, expect, it } from 'vitest';
import { formatReceipt, formatReceiptText, RECEIPT_WIDTH } from './receipt-formatter';
import type { ReceiptData } from './receipt-types';

const BUSINESS = {
  name: 'DREAM MAKEOVER',
  tagline: 'A Luxury Beauty Salon',
  addressLines: ['123 Test Road', 'Dhaka, Bangladesh'],
  phone: '+880 1XXX-XXXXXX',
};

function baseReceipt(overrides: Partial<ReceiptData> = {}): ReceiptData {
  return {
    invoiceId: 'DM-20260915-0001',
    createdAt: '2026-09-15T08:30:00.000Z',
    cashier: 'admin',
    customer: null,
    items: [
      {
        name: 'Bridal Facial',
        quantity: 1,
        unitPriceMinor: 350000,
        totalPriceMinor: 350000,
      },
    ],
    subtotalMinor: 350000,
    discountMinor: 0,
    vatRatePercent: 0,
    vatMinor: 0,
    totalMinor: 350000,
    cashReceivedMinor: 500000,
    changeMinor: 150000,
    loyalty: null,
    business: BUSINESS,
    ...overrides,
  };
}

describe('formatReceipt', () => {
  it('produces lines that fit the 48-column printer', () => {
    const lines = formatReceipt(baseReceipt());
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(RECEIPT_WIDTH);
    }
  });

  it('starts with the cash receipt heading', () => {
    const lines = formatReceipt(baseReceipt());
    expect(lines[0]).toBe('CASH RECEIPT');
    expect(lines[1]).toBe(BUSINESS.name);
  });

  it('includes the invoice ID', () => {
    const lines = formatReceipt(baseReceipt());
    expect(lines.some((l) => l.includes('Invoice No') && l.includes('DM-20260915-0001'))).toBe(
      true,
    );
  });

  it('shows "Guest" when no customer is attached', () => {
    const lines = formatReceipt(baseReceipt());
    expect(lines.some((l) => l.includes('Customer Name') && l.includes('Guest'))).toBe(true);
  });

  it('shows customer name and tier when attached', () => {
    const lines = formatReceipt(
      baseReceipt({
        customer: {
          name: 'Alice Rahman',
          phone: null,
          tier: 'Gold',
          totalPoints: 250,
        },
      }),
    );
    expect(lines.some((l) => l.includes('Alice Rahman'))).toBe(true);
    expect(lines.some((l) => l.includes('Customer Name') && l.includes('Alice Rahman'))).toBe(true);
  });

  it('truncates a long customer name', () => {
    const lines = formatReceipt(
      baseReceipt({
        customer: {
          name: 'A Very Long Customer Name That Cannot Fit',
          phone: null,
          tier: 'Gold',
          totalPoints: 250,
        },
      }),
    );
    const customerLine = lines.find((l) => l.includes('Customer Name'));
    expect(customerLine).toBeDefined();
    expect(customerLine!.length).toBeLessThanOrEqual(RECEIPT_WIDTH);
    expect(customerLine).toContain('\u2026');
  });

  it('renders item, quantity, and total columns', () => {
    const lines = formatReceipt(
      baseReceipt({
        items: [
          { name: 'Facial', quantity: 1, unitPriceMinor: 200000, totalPriceMinor: 200000 },
          { name: 'Lipstick', quantity: 2, unitPriceMinor: 120000, totalPriceMinor: 240000 },
        ],
      }),
    );
    expect(lines.some((l) => l.includes('Facial') && l.includes('1'))).toBe(true);
    expect(lines.some((l) => l.includes('Lipstick') && l.includes('2'))).toBe(true);
    expect(lines.some((l) => l.includes('SL') && l.includes('Service/Product'))).toBe(true);
    expect(
      lines.some((l) => l.includes('Qty') && l.includes('Rate(t)') && l.includes('Amount(t)')),
    ).toBe(true);
    expect(lines.some((l) => l.includes('Facial') && l.includes('1'))).toBe(true);
    expect(lines.some((l) => l.includes('Lipstick') && l.includes('2'))).toBe(true);
  });

  it('separates receipt labels from values with colons', () => {
    const lines = formatReceipt(baseReceipt());
    expect(lines.some((l) => /Invoice No\s+:/.test(l))).toBe(true);
    expect(lines.some((l) => /Customer Name\s+:Guest/.test(l))).toBe(true);
    expect(lines.some((l) => /Subtotal\s+:/.test(l))).toBe(true);
  });

  it('keeps all label colons in one vertical column', () => {
    const lines = formatReceipt(
      baseReceipt({
        customer: { name: 'Alice', phone: '0123456789', tier: 'Gold', totalPoints: 1 },
      }),
    );
    const colonPositions = lines
      .filter((line) =>
        /^(Invoice No|Date|Time|Customer Name|Mobile No|Subtotal|Total Amount)\s+:/.test(line),
      )
      .map((line) => line.indexOf(':'));
    expect(new Set(colonPositions).size).toBe(1);
  });

  it('includes discount line only when discount > 0', () => {
    const withoutDiscount = formatReceipt(baseReceipt({ discountMinor: 0 }));
    expect(withoutDiscount.some((l) => l.startsWith('Discount'))).toBe(false);

    const withDiscount = formatReceipt(baseReceipt({ discountMinor: 5000 }));
    expect(withDiscount.some((l) => l.startsWith('Discount'))).toBe(true);
    expect(withDiscount.some((l) => l.includes('-50.00'))).toBe(true);
  });

  it('includes the loyalty section only when points earned > 0', () => {
    const noLoyalty = formatReceipt(baseReceipt({ loyalty: null }));
    expect(noLoyalty.some((l) => l.startsWith('Points earned'))).toBe(false);

    const withLoyalty = formatReceipt(
      baseReceipt({
        loyalty: { pointsEarned: 35, totalPoints: 285, tier: 'Gold' },
      }),
    );
    expect(withLoyalty.some((l) => l.startsWith('Points earned'))).toBe(true);
    expect(withLoyalty.some((l) => l.startsWith('Total points'))).toBe(true);
  });

  it('includes the thank-you footer', () => {
    const lines = formatReceipt(baseReceipt());
    expect(lines.some((line) => line.trim() === 'Thank You')).toBe(true);
    expect(lines.some((line) => line.trim() === 'Visit Again')).toBe(true);
  });

  it('handles an empty items list gracefully', () => {
    const lines = formatReceipt(baseReceipt({ items: [] }));
    expect(lines.some((l) => l.includes('(no items)'))).toBe(true);
  });

  it('formats money without thousand separators', () => {
    const lines = formatReceipt(
      baseReceipt({
        subtotalMinor: 1234567,
        totalMinor: 1234567,
        cashReceivedMinor: 2000000,
        changeMinor: 765433,
      }),
    );
    expect(lines.some((l) => l.includes('12345.67'))).toBe(true);
  });
});

describe('formatReceiptText', () => {
  it('joins lines with newlines', () => {
    const text = formatReceiptText(baseReceipt());
    const lines = text.split('\n');
    expect(lines.length).toBeGreaterThan(10);
    expect(lines[0]).toBe('CASH RECEIPT');
  });
});
