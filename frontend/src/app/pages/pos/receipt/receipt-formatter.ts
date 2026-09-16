import type { ReceiptData } from './receipt-types';

export const RECEIPT_WIDTH = 32;

/**
 * Formats a decimal amount for the receipt.
 *
 * Uses plain decimal notation (no thousand separators) because space on
 * a 32-character thermal receipt is scarce and separators consume width
 * unnecessarily.
 *
 * Example: 570000 → "5700.00"
 */
function formatMoney(minor: number): string {
  return (minor / 100).toFixed(2);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '\u2026'; // ellipsis
}

function center(text: string, width = RECEIPT_WIDTH): string {
  const safe = truncate(text, width);
  const totalPad = width - safe.length;
  const leftPad = Math.floor(totalPad / 2);
  return ' '.repeat(leftPad) + safe;
}

function leftRight(left: string, right: string, width = RECEIPT_WIDTH): string {
  const rightLen = right.length;
  const maxLeft = width - rightLen - 1;

  if (maxLeft <= 0) {
    // Not enough room; keep the right side and truncate the left.
    return ' ' + right;
  }

  const safeLeft = truncate(left, maxLeft);
  const gap = width - safeLeft.length - rightLen;
  return safeLeft + ' '.repeat(gap) + right;
}

function divider(char = '-'): string {
  return char.repeat(RECEIPT_WIDTH);
}

function blank(): string {
  return '';
}

/**
 * Formats a Date string as "DD/MM/YYYY HH:mm" using local time.
 *
 * Example: "2026-09-15T08:30:00.000Z" → "15/09/2026 14:30" (in UTC+6)
 */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

/**
 * Formats a receipt into an array of lines, each at most 32 characters.
 *
 * The output is ready for an 80mm thermal printer. It can be displayed
 * as-is in a monospace preview, printed as text, or converted to
 * ESC/POS bytes by a printer adapter.
 */
export function formatReceipt(data: ReceiptData): string[] {
  const lines: string[] = [];

  // Business header
  lines.push(divider('='));
  lines.push(center(data.business.name));
  if (data.business.tagline) {
    lines.push(center(data.business.tagline));
  }
  for (const line of data.business.addressLines) {
    lines.push(center(line));
  }
  if (data.business.phone) {
    lines.push(center(data.business.phone));
  }
  lines.push(divider('='));
  lines.push(blank());

  // Transaction header
  lines.push(`Invoice: ${data.invoiceId}`);
  lines.push(`Date:    ${formatDateTime(data.createdAt)}`);
  lines.push(`Cashier: ${data.cashier}`);
  if (data.customer) {
    lines.push(`Customer: ${truncate(data.customer.name, RECEIPT_WIDTH - 10)}`);
    lines.push(`Tier:     ${data.customer.tier}`);
  } else {
    lines.push('Customer: Guest');
  }
  lines.push(divider());
  lines.push(blank());

  // Items
  lines.push('Item                    Total');
  lines.push(divider());

  if (data.items.length === 0) {
    lines.push(center('(no items)'));
  } else {
    for (const item of data.items) {
      lines.push(truncate(item.name, RECEIPT_WIDTH));
      const qtyLine = `  ${item.quantity} x ${formatMoney(item.unitPriceMinor)}`;
      const totalLine = formatMoney(item.totalPriceMinor);
      lines.push(leftRight(qtyLine, totalLine));
    }
  }

  lines.push(divider());
  lines.push(blank());

  // Totals
  lines.push(leftRight('Subtotal', formatMoney(data.subtotalMinor)));
  if (data.discountMinor > 0) {
    lines.push(leftRight('Discount', `-${formatMoney(data.discountMinor)}`));
  }
  lines.push(leftRight('TOTAL', formatMoney(data.totalMinor)));
  lines.push(leftRight('Paid', formatMoney(data.cashReceivedMinor)));
  lines.push(leftRight('Change', formatMoney(data.changeMinor)));
  lines.push(divider());
  lines.push(blank());

  // Loyalty
  if (data.loyalty && data.loyalty.pointsEarned > 0) {
    lines.push(leftRight('Points earned', String(data.loyalty.pointsEarned)));
    lines.push(leftRight('Total points', String(data.loyalty.totalPoints)));
    lines.push(leftRight('Tier', data.loyalty.tier));
    lines.push(divider());
    lines.push(blank());
  }

  // Footer
  lines.push(blank());
  lines.push(center('Thank You For Visiting'));
  lines.push(center('We look forward to seeing'));
  lines.push(center('you again soon'));
  lines.push(divider('='));

  return lines;
}

/**
 * Convenience wrapper: joins the formatted lines with newlines.
 */
export function formatReceiptText(data: ReceiptData): string {
  return formatReceipt(data).join('\n');
}
