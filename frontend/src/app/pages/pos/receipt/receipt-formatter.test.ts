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
    totalMinor: 350000,
    cashReceivedMinor: 500000,
    changeMinor: 150000,
    loyalty: null,
    business: BUSINESS,
    ...overrides,
  };
}

describe('formatReceipt', () => {
  it('produces lines that are never longer than 32 characters', () => {
    const lines = formatReceipt(baseReceipt());
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(RECEIPT_WIDTH);
    }
  });

  it('centers the business name', () => {
    const lines = formatReceipt(baseReceipt());
    const businessNameLine = lines.find((line) => line.trim() === BUSINESS.name);
    expect(businessNameLine).toBe(
      ' '.repeat(Math.floor((RECEIPT_WIDTH - BUSINESS.name.length) / 2)) + BUSINESS.name,
    );
  });

  it('includes the invoice ID', () => {
    const lines = formatReceipt(baseReceipt());
    expect(lines.some((l) => l.startsWith('Invoice: DM-20260915-0001'))).toBe(true);
  });

  it('shows "Guest" when no customer is attached', () => {
    const lines = formatReceipt(baseReceipt());
    expect(lines).toContain('Customer: Guest');
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
    expect(lines).toContain('Tier:     Gold');
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
    const customerLine = lines.find((l) => l.startsWith('Customer:'));
    expect(customerLine).toBeDefined();
    expect(customerLine!.length).toBeLessThanOrEqual(RECEIPT_WIDTH);
    expect(customerLine).toContain('\u2026');
  });

  it('renders one line pair per item', () => {
    const lines = formatReceipt(
      baseReceipt({
        items: [
          { name: 'Facial', quantity: 1, unitPriceMinor: 200000, totalPriceMinor: 200000 },
          { name: 'Lipstick', quantity: 2, unitPriceMinor: 120000, totalPriceMinor: 240000 },
        ],
      }),
    );
    expect(lines.some((l) => l === 'Facial')).toBe(true);
    expect(lines.some((l) => l === 'Lipstick')).toBe(true);
    expect(lines.some((l) => l.includes('1 x 2000.00'))).toBe(true);
    expect(lines.some((l) => l.includes('2 x 1200.00'))).toBe(true);
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
    expect(lines.some((line) => line.trim() === 'Thank You For Visiting')).toBe(true);
    expect(lines.some((line) => line.trim() === 'We look forward to seeing')).toBe(true);
    expect(lines.some((line) => line.trim() === 'you again soon')).toBe(true);
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
    expect(lines[0]).toBe('================================');
  });
});
