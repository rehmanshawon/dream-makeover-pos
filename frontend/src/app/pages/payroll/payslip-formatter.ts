import type { ReceiptLine } from '../pos/receipt/printer/receipt-printer';
import type { BusinessInfo } from '../../../config/business';

export interface PayslipInput {
  employeeName: string;
  employeeRole: string;
  periodName: string;
  periodStart: string;
  periodEnd: string;
  paidOn: string;
  workedDays: number;
  dailyRateMinor: number;
  baseSalaryMinor: number;
  amountPaidMinor: number;
  paymentMethodLabel: string;
  paymentTypeLabel: string;
  note: string | null;
  recordedBy: string;
}

const WIDTH = 48;

function formatMoney(minor: number): string {
  return (minor / 100).toFixed(2);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '\u2026';
}

function center(text: string, width = WIDTH): string {
  const safe = truncate(text, width);
  const totalPad = width - safe.length;
  const leftPad = Math.floor(totalPad / 2);
  const rightPad = totalPad - leftPad;
  return ' '.repeat(leftPad) + safe + ' '.repeat(rightPad);
}

function labelValue(label: string, value: string): string {
  const labelWidth = 16;
  const prefix = `${truncate(label, labelWidth).padEnd(labelWidth)} : `;
  const remaining = WIDTH - prefix.length;
  return prefix + truncate(value, remaining);
}

function divider(char = '-'): string {
  return char.repeat(WIDTH);
}

function formatDate(iso: string): string {
  const [y = 0, m = 1, d = 1] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
}

function text(
  value: string,
  opts: Omit<Extract<ReceiptLine, { type: 'text' }>, 'type' | 'text'> = {},
): ReceiptLine {
  return { type: 'text', text: value, ...opts };
}

/**
 * Formats a payslip for a single salary payment.
 */
export function formatPayslip(input: PayslipInput, business: BusinessInfo): ReceiptLine[] {
  const lines: ReceiptLine[] = [];

  lines.push(text(divider('=')));
  lines.push(text(center(business.name), { align: 'center', bold: true }));
  if (business.tagline) {
    lines.push(text(center(business.tagline), { align: 'center' }));
  }
  if (business.phone) {
    lines.push(text(center(business.phone), { align: 'center' }));
  }
  lines.push(text(divider('=')));
  lines.push(text(''));
  lines.push(text('PAY SLIP', { align: 'center', bold: true, large: true }));
  lines.push(text(''));

  lines.push(text(labelValue('Employee', input.employeeName)));
  lines.push(text(labelValue('Role', input.employeeRole)));
  lines.push(text(labelValue('Period', input.periodName)));
  lines.push(
    text(labelValue('Dates', `${formatDate(input.periodStart)} to ${formatDate(input.periodEnd)}`)),
  );
  lines.push(text(labelValue('Paid on', formatDate(input.paidOn))));
  lines.push(text(divider()));

  lines.push(text('EARNINGS', { bold: true }));
  lines.push(text(divider()));
  lines.push(text(labelValue('Daily rate', formatMoney(input.dailyRateMinor))));
  lines.push(text(labelValue('Worked days', String(input.workedDays))));
  lines.push(
    text(labelValue('Base salary', formatMoney(input.baseSalaryMinor)), {
      bold: true,
    }),
  );
  lines.push(text(divider()));

  lines.push(text('PAYMENT', { bold: true }));
  lines.push(text(divider()));
  lines.push(
    text(labelValue('Amount paid', formatMoney(input.amountPaidMinor)), {
      bold: true,
      large: true,
    }),
  );
  lines.push(text(labelValue('Method', input.paymentMethodLabel)));
  lines.push(text(labelValue('Type', input.paymentTypeLabel)));
  lines.push(text(divider()));

  if (input.note) {
    lines.push(text('Notes:', { bold: true }));
    const words = input.note.split(/\s+/);
    let current = '';
    for (const w of words) {
      if ((current + ' ' + w).trim().length > WIDTH) {
        lines.push(text(current.trim()));
        current = w;
      } else {
        current = `${current} ${w}`;
      }
    }
    if (current.trim()) lines.push(text(current.trim()));
    lines.push(text(divider()));
  }

  lines.push(text(labelValue('Recorded by', input.recordedBy)));
  lines.push(text(''));
  lines.push(text(''));
  lines.push(text('Employee signature: ______________'));
  lines.push(text(''));
  lines.push(text(''));
  lines.push(text(center('Thank you.'), { align: 'center' }));

  return lines;
}
