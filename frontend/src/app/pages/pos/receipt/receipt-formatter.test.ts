import { describe, expect, it } from 'vitest';
import { formatReceipt, formatReceiptText, RECEIPT_WIDTH } from './receipt-formatter';
import type { ReceiptData } from './receipt-types';

const BUSINESS = {
  name: 'DREAM MAKEOVER',
  tagline: 'A Luxury Beauty Salon',
  addressLines: ['123 Test Road', 'Dhaka, Bangladesh'],
  phone: '+880 1XXX-XXXXXX',
  website: null,
  email: null,
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

/**
 * Returns only the text of the receipt lines. Image lines are dropped.
 * Convenient for tests that only care about content.
 */
function textLines(data: ReceiptData): string[] {
  return formatReceipt(data)
    .filter((line) => line.type === 'text')
    .map((line) => line.text);
}

describe('formatReceipt', () => {
  it('starts with a logo image line', () => {
    const lines = formatReceipt(baseReceipt());
    expect(lines[0]?.type).toBe('image');
  });

  it('produces text lines that fit the 48-column printer', () => {
    for (const line of textLines(baseReceipt())) {
      expect(line.length).toBeLessThanOrEqual(RECEIPT_WIDTH);
    }
  });

  it('contains a large bold CASH RECEIPT heading', () => {
    const lines = formatReceipt(baseReceipt());
    const heading = lines.find((l) => l.type === 'text' && l.text === 'CASH RECEIPT');
    expect(heading).toBeDefined();
    if (heading && heading.type === 'text') {
      expect(heading.bold).toBe(true);
      expect(heading.large).toBe(true);
      expect(heading.align).toBe('center');
    }
  });

  it('contains a centered business name', () => {
    const lines = formatReceipt(baseReceipt());
    const nameLine = lines.find((l) => l.type === 'text' && l.text === BUSINESS.name.toUpperCase());
    expect(nameLine).toBeDefined();
    if (nameLine && nameLine.type === 'text') {
      expect(nameLine.align).toBe('center');
      expect(nameLine.bold).toBe(true);
    }
  });

  it('includes the invoice ID', () => {
    const lines = textLines(baseReceipt());
    expect(lines.some((l) => l.includes('Invoice No') && l.includes('DM-20260915-0001'))).toBe(
      true,
    );
  });

  it('shows "Guest" when no customer is attached', () => {
    const lines = textLines(baseReceipt());
    expect(lines.some((l) => l.includes('Customer Name') && l.includes('Guest'))).toBe(true);
  });

  it('shows customer name and tier when attached', () => {
    const lines = textLines(
      baseReceipt({
        customer: {
          name: 'Alice Rahman',
          phone: null,
          tier: 'Gold',
          totalPoints: 250,
        },
      }),
    );
    expect(lines.some((l) => l.includes('Customer Name') && l.includes('Alice Rahman'))).toBe(true);
  });

  it('truncates a long customer name', () => {
    const lines = textLines(
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
  });

  it('renders item, quantity, and total columns', () => {
    const lines = textLines(
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
  });

  it('separates receipt labels from values with colons', () => {
    const lines = textLines(baseReceipt());
    expect(lines.some((l) => /Invoice No\s+:/.test(l))).toBe(true);
    expect(lines.some((l) => /Customer Name\s+:Guest/.test(l))).toBe(true);
    expect(lines.some((l) => /Subtotal\s+:/.test(l))).toBe(true);
  });

  it('keeps all label colons in one vertical column', () => {
    const lines = textLines(
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
    const withoutDiscount = textLines(baseReceipt({ discountMinor: 0 }));
    expect(withoutDiscount.some((l) => l.startsWith('Discount'))).toBe(false);

    const withDiscount = textLines(baseReceipt({ discountMinor: 5000 }));
    expect(withDiscount.some((l) => l.startsWith('Discount'))).toBe(true);
    expect(withDiscount.some((l) => l.includes('50.00'))).toBe(true);
  });

  it('includes the loyalty section only when points earned > 0', () => {
    const noLoyalty = textLines(baseReceipt({ loyalty: null }));
    expect(noLoyalty.some((l) => l.startsWith('Points earned'))).toBe(false);

    const withLoyalty = textLines(
      baseReceipt({
        loyalty: { pointsEarned: 35, totalPoints: 285, tier: 'Gold' },
      }),
    );
    expect(withLoyalty.some((l) => l.startsWith('Points earned'))).toBe(true);
    expect(withLoyalty.some((l) => l.startsWith('Total points'))).toBe(true);
  });

  it('includes the thank-you footer', () => {
    const lines = textLines(baseReceipt());
    expect(lines.some((line) => line.trim() === 'Thank You')).toBe(true);
    expect(lines.some((line) => line.trim() === 'Visit Again')).toBe(true);
  });

  it('handles an empty items list gracefully', () => {
    const lines = textLines(baseReceipt({ items: [] }));
    expect(lines.some((l) => l.includes('(no items)'))).toBe(true);
  });

  it('formats money without thousand separators', () => {
    const lines = textLines(
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
  it('joins text lines with newlines and marks images', () => {
    const text = formatReceiptText(baseReceipt());
    const lines = text.split('\n');
    expect(lines.length).toBeGreaterThan(10);
    // First line is the logo image marker
    expect(lines[0]).toBe('[image: /logo.png]');
  });
});
