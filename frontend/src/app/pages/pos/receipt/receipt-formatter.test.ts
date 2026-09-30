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
    manualDiscountMinor: 0,
    rewardDiscountMinor: 0,
    discountMinor: 0,
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
  it('starts with the receipt title when the optional logo is omitted', () => {
    const lines = formatReceipt(baseReceipt());
    expect(lines[0]).toMatchObject({ type: 'text', text: 'CASH RECEIPT' });
  });

  it('keeps the header compact to save two lines of paper', () => {
    const lines = formatReceipt(baseReceipt());
    const firstDividerIndex = lines.findIndex(
      (line) => line.type === 'text' && line.text.includes('---'),
    );

    expect(
      lines.slice(0, firstDividerIndex).every((line) => line.type !== 'text' || line.text !== ''),
    ).toBe(true);
  });

  it('produces text lines that fit the 64-column Font B layout', () => {
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

  it('does not include a VAT line', () => {
    expect(textLines(baseReceipt()).some((line) => /\bVAT\b/i.test(line))).toBe(false);
  });

  it('aligns item amounts and every total value to the far-right receipt column', () => {
    const lines = textLines(
      baseReceipt({
        items: [{ name: 'Facial', quantity: 1, unitPriceMinor: 350000, totalPriceMinor: 350000 }],
        subtotalMinor: 350000,
        totalMinor: 350000,
      }),
    );
    const item = lines.find((line) => line.includes('Facial'));
    const subtotal = lines.find((line) => line.startsWith('Subtotal'));
    const total = lines.find((line) => line.startsWith('Total Amount'));

    expect(item).toHaveLength(RECEIPT_WIDTH);
    expect(item?.endsWith('3500.00')).toBe(true);
    expect(subtotal).toHaveLength(RECEIPT_WIDTH);
    expect(subtotal?.endsWith('3500.00')).toBe(true);
    expect(total).toHaveLength(RECEIPT_WIDTH);
    expect(total?.endsWith('3500.00')).toBe(true);

    const formattedTotal = formatReceipt(baseReceipt()).find(
      (line) => line.type === 'text' && line.text.startsWith('Total Amount'),
    );
    expect(formattedTotal).toMatchObject({ bold: true, medium: true });
    expect(
      formatReceipt(baseReceipt()).find(
        (line) => line.type === 'text' && line.text.startsWith('Subtotal'),
      ),
    ).toMatchObject({ bold: true, medium: true });
  });

  it('moves the quantity column three spaces toward the service column', () => {
    const header = textLines(baseReceipt()).find((line) => line.includes('Service/Product'));

    expect(header?.indexOf('Qty')).toBe(33);
    expect(header?.indexOf('Rate')).toBe(48);
    expect(header?.indexOf('Amount')).toBe(58);
    expect(header).toHaveLength(RECEIPT_WIDTH);
  });

  it('separates receipt labels from values with colons', () => {
    const lines = textLines(baseReceipt());
    expect(lines.some((l) => /Invoice No\s+:/.test(l))).toBe(true);
    expect(lines.some((l) => /Customer Name\s+:\s+Guest/.test(l))).toBe(true);
    expect(lines.some((l) => /Subtotal\s+:/.test(l))).toBe(true);
    expect(
      lines
        .filter((line) =>
          /^(Invoice No|Date|Time|Customer Name|Payment Method|Staff Name)/.test(line),
        )
        .every((line) => line.length === RECEIPT_WIDTH),
    ).toBe(true);
  });

  it('left-aligns transaction, payment, staff, and loyalty values after their colons', () => {
    const lines = textLines(
      baseReceipt({
        customer: { name: 'Alice Rahman', phone: '0123456789', tier: 'Gold', totalPoints: 250 },
        loyalty: { pointsEarned: 35, pointsRedeemed: 5, totalPoints: 280, tier: 'Gold' },
      }),
    );
    const expectedValues = [
      ['Invoice No', 'DM-20260915-0001'],
      ['Customer Name', 'Alice Rahman'],
      ['Mobile No', '0123456789'],
      ['Payment Method', 'Cash'],
      ['Staff Name', 'admin'],
      ['Points earned', '35'],
      ['Points redeemed', '5'],
      ['Total points', '280'],
      ['Tier', 'Gold'],
    ] as const;

    for (const [label, value] of expectedValues) {
      const line = lines.find((candidate) => candidate.startsWith(label));
      expect(line).toBeDefined();
      expect(line?.slice((line?.indexOf(':') ?? -1) + 1).startsWith(` ${value}`)).toBe(true);
    }
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

    const withDiscount = textLines(baseReceipt({ manualDiscountMinor: 5000, discountMinor: 5000 }));
    expect(withDiscount.some((l) => l.startsWith('Discount'))).toBe(true);
    expect(withDiscount.some((l) => l.includes('50.00'))).toBe(true);
  });

  it('includes the loyalty section only when points earned > 0', () => {
    const noLoyalty = textLines(baseReceipt({ loyalty: null }));
    expect(noLoyalty.some((l) => l.startsWith('Points earned'))).toBe(false);

    const withLoyalty = textLines(
      baseReceipt({
        loyalty: { pointsEarned: 35, pointsRedeemed: 0, totalPoints: 285, tier: 'Gold' },
      }),
    );
    expect(withLoyalty.some((l) => l.startsWith('Points earned'))).toBe(true);
    expect(withLoyalty.some((l) => l.startsWith('Total points'))).toBe(true);
  });

  it('includes the thank-you footer', () => {
    const lines = textLines(baseReceipt());
    expect(lines.some((line) => line.trim() === 'Thank you for choosing Dream Makeover!')).toBe(
      true,
    );
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
  it('joins the formatted receipt lines with newlines', () => {
    const text = formatReceiptText(baseReceipt());
    const lines = text.split('\n');
    expect(lines.length).toBeGreaterThan(10);
    expect(lines[0]).toBe('CASH RECEIPT');
  });
});
