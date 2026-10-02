import type { ReceiptLine, ReceiptPrinter } from './receipt-printer';

const TOTAL_LABELS = new Set([
  'Subtotal',
  'Discount',
  'Reward discount',
  'Total Amount',
  'Paid Amount',
  'Due Amount',
  'Change',
]);
const DETAIL_LABELS = new Set([
  'Invoice No',
  'Date',
  'Time',
  'Customer Name',
  'Mobile No',
  'Payment Method',
  'Reference',
  'Staff Name',
  'Points earned',
  'Points redeemed',
  'Total points',
  'Tier',
]);

/**
 * Prints receipts using a hidden iframe + the browser print dialog.
 *
 * Using an iframe (instead of a popup) avoids popup blockers and, more
 * importantly, avoids inheriting the opener's default print margins which
 * often produce a ~1 inch gap at the top of the first page.
 *
 * The iframe has its own document with `@page { margin: 0 }`, so the
 * receipt starts flush at the top of the 80mm roll.
 */
export class BrowserReceiptPrinter implements ReceiptPrinter {
  readonly name = 'Browser print';

  async print(lines: ReceiptLine[]): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('Browser printing requires a window environment');
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText =
      'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(iframe);

    const cleanup = () => {
      // Give the print dialog a moment to release the iframe before removal.
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1000);
    };

    try {
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      if (!doc || !win) {
        throw new Error('Unable to create print frame');
      }

      doc.open();
      doc.write(this.buildHtml(lines));
      doc.close();

      // Wait for fonts and images so measurement is accurate.
      const images = Array.from(doc.images ?? []);
      await Promise.all([
        ...(doc.fonts ? [doc.fonts.ready] : []),
        ...images.map((image) =>
          image.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                image.addEventListener('load', () => resolve(), { once: true });
                image.addEventListener('error', () => resolve(), { once: true });
              }),
        ),
      ]);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Measure content height and set an exact page size.
      const bodyTop = doc.body.getBoundingClientRect().top;
      const children = Array.from(doc.body.children);
      const contentTop = children[0]?.getBoundingClientRect().top ?? bodyTop;
      const contentBottom = children.reduce(
        (bottom, child) => Math.max(bottom, child.getBoundingClientRect().bottom),
        contentTop,
      );
      const contentHeightMm = ((contentBottom - contentTop) * 25.4) / 96;
      const pageHeightMm = Math.max(210, Math.ceil(contentHeightMm + 25.4));

      const pageStyle = doc.createElement('style');
      pageStyle.textContent = `@page { size: 72mm ${pageHeightMm}mm; margin: 0; }`;
      doc.head.append(pageStyle);

      win.addEventListener('afterprint', cleanup, { once: true });

      try {
        win.focus();
        win.print();
      } catch {
        cleanup();
        throw new Error('Printing was blocked or failed');
      }

      // Fallback cleanup in case `afterprint` never fires (some browsers).
      setTimeout(cleanup, 30000);
    } catch (error) {
      cleanup();
      if (error instanceof Error) throw error;
      throw new Error('Unable to prepare the print frame');
    }
  }

  private buildHtml(lines: ReceiptLine[]): string {
    const body = lines.map((line) => this.renderLine(line)).join('');
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Receipt</title>
<style>
  @page { size: 72mm auto; margin: 0; }
  html, body {
     margin: 0 !important;
  padding: 0;
  width: 72mm;          /* was 80mm — matches the driver's printable width */
  background: #fff;
  color: #000;
  box-sizing: border-box;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  }
  body {
    width: 72mm;          /* was 80mm */
  min-height: 0;
  padding: 0 2mm;       /* keep your side padding */
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11px;
  line-height: 1.25;
  }
  /* Prevent first-child margin collapse from creating a top gap. */
  body > *:first-child { margin-top: 0 !important; }
  .line {
    display: block;
    width: 100%;
    box-sizing: border-box;
    overflow: visible;
    white-space: pre;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }
  .line--fixed  { width: 100%; font-family: Arial, Helvetica, sans-serif; font-size: 9px; font-weight: 400; }
  .line--bold   { font-weight: 700; }
  .line--large  { font-size: 16px; font-weight: bold; line-height: 1.35; }
  .line--total  { display: grid; grid-template-columns: 26mm 3mm minmax(0, 1fr); white-space: normal; }
  .line--total-value { text-align: right; }
  .line--label-value { display: grid; grid-template-columns: 26mm 3mm minmax(0, 1fr); white-space: normal; }
  .line--colon { text-align: center; }
  .line--value { min-width: 0; overflow-wrap: anywhere; }
  .line--items { display: grid; grid-template-columns: 4mm minmax(0, 1fr) 8mm 14mm 17mm; gap: 0.5mm; width: 100%; white-space: normal; font-size: 9px; }
  .line--items > :nth-child(n + 3) { text-align: right; }
  .line--item-header { font-weight: 700; }
  .line--item { font-weight: 400; }
  .line--divider { width: calc(100% + 4mm); height: 2.2mm; margin-left: -2mm; border-bottom: 0.2mm dashed #000; }
  .line--medium {
    width: 125%;
    font-size: 11px;
    font-weight: bold;
    line-height: 1.35;
    transform: scaleX(0.864);
    transform-origin: left center;
  }
  .line--center { text-align: center; }
  .line--right  { text-align: right; }
  .line--inverse {
    background: #000;
    color: #fff;
    padding: 2px 4px;
  }
  .line--image  { text-align: center; margin: 4px 0; }
  .line--image img { max-width: 48mm; height: auto; }
</style>
</head>
<body>${body}</body>
</html>`;
  }

  private renderLine(line: ReceiptLine): string {
    if (line.type === 'image') {
      return `<div class="line line--image"><img src="${escapeHtml(line.src)}" alt="" /></div>`;
    }

    if (/^[-=_]{48,}$/.test(line.text.trim())) {
      return '<div class="line line--divider"></div>';
    }

    const itemColumns = parseItemColumns(line.text);
    if (itemColumns) {
      const isHeader = itemColumns[0] === 'SL';
      const cells = itemColumns
        .map((value) => `<span>${escapeHtml(value)}</span>`)
        .join('');
      return `<div class="line line--items ${isHeader ? 'line--item-header' : 'line--item'}">${cells}</div>`;
    }

    const classes = ['line'];
    if (line.bold) classes.push('line--bold');
    if (line.large) classes.push('line--large');
    if (line.medium) classes.push('line--medium');
    if (line.inverse) classes.push('line--inverse');
    if (line.align === 'center') classes.push('line--center');
    else if (line.align === 'right') classes.push('line--right');

    const separator = line.text.indexOf(':');
    const totalLabel = separator >= 0 ? line.text.slice(0, separator).trim() : '';
    if (TOTAL_LABELS.has(totalLabel)) {
      classes.push('line--total');
      const value = line.text.slice(separator + 1).trim();
      return `<div class="${classes.join(' ')}"><span>${escapeHtml(totalLabel)}</span><span class="line--colon">:</span><span class="line--total-value">${escapeHtml(value)}</span></div>`;
    }

    if (DETAIL_LABELS.has(totalLabel) && separator >= 0) {
      classes.push('line--label-value');
      const value = line.text.slice(separator + 1).trim();
      return `<div class="${classes.join(' ')}"><span>${escapeHtml(totalLabel)}</span><span class="line--colon">:</span><span class="line--value">${escapeHtml(value)}</span></div>`;
    }

    if (line.text.length > 48) classes.push('line--fixed');

    // Empty lines need a non-breaking space to preserve the row height.
    const content = line.text.length === 0 ? '&nbsp;' : escapeHtml(line.text);
    return `<div class="${classes.join(' ')}">${content}</div>`;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseItemColumns(text: string): string[] | null {
  if (text.length !== 64) return null;

  const columns = [
    text.slice(0, 3).trim(),
    text.slice(4, 30).trim(),
    text.slice(31, 36).trim(),
    text.slice(40, 52).trim(),
    text.slice(53, 64).trim(),
  ];

  if (columns[0] === 'SL') return columns;
  return /^\d{1,3}$/.test(columns[0] ?? '') && Boolean(columns[1] && columns[4])
    ? columns
    : null;
}