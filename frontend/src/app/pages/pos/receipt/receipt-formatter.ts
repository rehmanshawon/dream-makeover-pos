import type { ReceiptData } from './receipt-types';
import type { ReceiptLine } from './printer/receipt-printer';

/**
 * Physical line width for 80mm thermal printers at the standard font.
 * Every character-aligned row in this file is padded to this width.
 */
export const RECEIPT_WIDTH = 48;

// -----------------------------------------------------------------------------
// Primitive helpers
// -----------------------------------------------------------------------------

function formatMoney(minor: number): string {
  return (minor / 100).toFixed(2);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '\u2026';
}

function rightAlign(text: string, width: number): string {
  return truncate(text, width).padStart(width);
}

function leftAlign(text: string, width: number): string {
  return truncate(text, width).padEnd(width);
}

function divider(char = '-'): string {
  return char.repeat(RECEIPT_WIDTH);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${min}`;
}

// -----------------------------------------------------------------------------
// Row builders (fixed-width monospace rows)
// -----------------------------------------------------------------------------

function labelValue(label: string, value: string): string {
  const labelWidth = 16;
  const padded = truncate(label, labelWidth).padEnd(labelWidth);
  const prefix = `${padded} :`;
  const remaining = RECEIPT_WIDTH - prefix.length;
  return prefix + truncate(value, remaining);
}

function itemRow(
  serial: string,
  item: string,
  quantity: string,
  rate: string,
  amount: string,
): string {
  const sl = leftAlign(serial, 3);
  const name = leftAlign(item, 20);
  const qty = rightAlign(quantity, 4);
  const r = rightAlign(rate, 9);
  const a = rightAlign(amount, 9);
  const full = `${sl} ${name} ${qty} ${r} ${a}`;
  return full.slice(0, RECEIPT_WIDTH).padEnd(RECEIPT_WIDTH);
}

function itemHeaderRow(): string {
  return itemRow('SL', 'Service/Product', 'Qty', 'Rate(৳)', 'Amount(৳)');
}

function totalRow(label: string, value: string): string {
  const labelWidth = 16;
  const valueWidth = 12;
  return `${truncate(label, labelWidth).padEnd(labelWidth)} : ${rightAlign(value, valueWidth)}`;
}

// -----------------------------------------------------------------------------
// Line constructors
// -----------------------------------------------------------------------------

function text(
  value: string,
  opts: Omit<Extract<ReceiptLine, { type: 'text' }>, 'type' | 'text'> = {},
): ReceiptLine {
  return { type: 'text', text: value, ...opts };
}

// -----------------------------------------------------------------------------
// Main formatter
// -----------------------------------------------------------------------------

/**
 * Formats a receipt as a structured line stream.
 *
 * Layout, top to bottom:
 *   1. Logo, CASH RECEIPT title, business name, tagline, address, phone
 *   2. Divider
 *   3. Transaction header (label-value pairs)
 *   4. Divider
 *   5. Item table (header row + item rows)
 *   6. Divider
 *   7. Totals (with Total Amount emphasized as inverse)
 *   8. Divider
 *   9. Footer info (payment method, staff, remarks)
 *   10. Loyalty (when applicable)
 *   11. Thank-you footer
 */
export function formatReceipt(data: ReceiptData): ReceiptLine[] {
  const lines: ReceiptLine[] = [];

  // ---------------------------------------------------------------------------
  // 1. Header
  // ---------------------------------------------------------------------------
  lines.push({
    type: 'image',
    src: '/logo.png',
    maxWidthDots: 192,
  });

  lines.push(text('CASH RECEIPT', { align: 'center', bold: true, large: true }));
  lines.push(text(''));
  lines.push(
    text(data.business.name.toUpperCase(), {
      align: 'center',
      bold: true,
    }),
  );
  if (data.business.tagline) {
    lines.push(text(`\u2014 ${data.business.tagline} \u2014`, { align: 'center' }));
  }
  lines.push(text(''));
  for (const addressLine of data.business.addressLines) {
    lines.push(text(addressLine, { align: 'center' }));
  }
  if (data.business.phone) {
    lines.push(text(data.business.phone, { align: 'center' }));
  }
  lines.push(text(divider()));

  // ---------------------------------------------------------------------------
  // 2. Transaction header
  // ---------------------------------------------------------------------------
  lines.push(text(labelValue('Invoice No', data.invoiceId)));
  lines.push(text(labelValue('Date', formatDate(data.createdAt))));
  lines.push(text(labelValue('Time', formatTime(data.createdAt))));

  if (data.customer) {
    lines.push(text(labelValue('Customer Name', data.customer.name)));
    const phone = (data.customer as { phone?: string | null }).phone;
    if (phone) {
      lines.push(text(labelValue('Mobile No', phone)));
    }
  } else {
    lines.push(text(labelValue('Customer Name', 'Guest')));
  }
  lines.push(text(divider()));

  // ---------------------------------------------------------------------------
  // 3. Item table
  // ---------------------------------------------------------------------------
  lines.push(text(itemHeaderRow(), { bold: true }));
  lines.push(text(divider()));

  if (data.items.length === 0) {
    lines.push(text('(no items)', { align: 'center' }));
  } else {
    for (const [index, item] of data.items.entries()) {
      lines.push(
        text(
          itemRow(
            String(index + 1),
            item.name,
            String(item.quantity),
            formatMoney(item.unitPriceMinor),
            formatMoney(item.totalPriceMinor),
          ),
        ),
      );
    }
  }
  lines.push(text(divider()));

  // ---------------------------------------------------------------------------
  // 4. Totals
  // ---------------------------------------------------------------------------
  lines.push(text(totalRow('Subtotal', formatMoney(data.subtotalMinor))));

  if (data.discountMinor > 0) {
    lines.push(text(totalRow('Discount', formatMoney(data.discountMinor))));
  }

  const maybeVat = data as unknown as {
    vatRatePercent?: number;
    vatMinor?: number;
  };
  const vatRatePercent = typeof maybeVat.vatRatePercent === 'number' ? maybeVat.vatRatePercent : 0;
  const vatMinor = typeof maybeVat.vatMinor === 'number' ? maybeVat.vatMinor : 0;
  if (vatRatePercent > 0) {
    lines.push(text(totalRow(`VAT (${vatRatePercent.toFixed(2)}%)`, formatMoney(vatMinor))));
  }

  lines.push(
    text(totalRow('Total Amount', formatMoney(data.totalMinor)), {
      bold: true,
      large: true,
      inverse: true,
    }),
  );
  lines.push(text(totalRow('Paid Amount', formatMoney(data.cashReceivedMinor))));

  const dueMinor = Math.max(0, data.totalMinor - data.cashReceivedMinor);
  lines.push(text(totalRow('Due Amount', formatMoney(dueMinor))));
  lines.push(text(totalRow('Change', formatMoney(data.changeMinor))));
  lines.push(text(divider()));

  // ---------------------------------------------------------------------------
  // 5. Footer info
  // ---------------------------------------------------------------------------
  lines.push(text(labelValue('Payment Method', 'Cash')));
  lines.push(text(labelValue('Staff Name', data.cashier)));
  lines.push(text(labelValue('Remarks', 'Thank you for choosing Dream Makeover!')));
  lines.push(text(divider()));

  // ---------------------------------------------------------------------------
  // 6. Loyalty
  // ---------------------------------------------------------------------------
  if (data.loyalty && data.loyalty.pointsEarned > 0) {
    lines.push(text(labelValue('Points earned', String(data.loyalty.pointsEarned))));
    lines.push(text(labelValue('Total points', String(data.loyalty.totalPoints))));
    lines.push(text(labelValue('Tier', data.loyalty.tier)));
    lines.push(text(divider()));
  }

  // ---------------------------------------------------------------------------
  // 7. Footer greeting
  // ---------------------------------------------------------------------------
  lines.push(text('Thank You', { align: 'center', bold: true, large: true }));
  lines.push(text('Visit Again', { align: 'center' }));

  return lines;
}

/**
 * Convenience wrapper: joins the formatted lines as plain text.
 *
 * Intended for debugging, logging, or any context that needs the
 * receipt content without styling. Style-bearing fields are ignored.
 */
export function formatReceiptText(data: ReceiptData): string {
  return formatReceipt(data)
    .map((line) => {
      if (line.type === 'image') return `[image: ${line.src}]`;
      return line.text;
    })
    .join('\n');
}
