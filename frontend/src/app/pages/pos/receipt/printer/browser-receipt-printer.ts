import type { ReceiptLine, ReceiptPrinter } from './receipt-printer';

/**
 * Prints receipts using the browser print dialog.
 *
 * Renders each structured line as styled HTML. This preserves the
 * intent of the receipt formatter (bold, large, inverse, alignment)
 * when printing from a regular browser tab.
 */
export class BrowserReceiptPrinter implements ReceiptPrinter {
  readonly name = 'Browser print';

  async print(lines: ReceiptLine[]): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Browser printing requires a window environment');
    }

    const popup = window.open('', 'receipt', 'width=440,height=680');
    if (!popup) {
      throw new Error('Unable to open print window. Check that popups are allowed.');
    }

    try {
      popup.document.open();
      popup.document.write(this.buildHtml(lines));
      popup.document.close();
    } catch {
      popup.close();
      throw new Error('Unable to prepare the print window');
    }

    const images = Array.from(popup.document.images ?? []);
    await Promise.all([
      ...(popup.document.fonts ? [popup.document.fonts.ready] : []),
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

    try {
      popup.addEventListener('afterprint', () => popup.close(), { once: true });
      popup.focus();
      popup.print();
    } catch {
      popup.close();
      throw new Error('Printing was blocked or failed');
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
  @page { size: 80mm auto; margin: 2mm; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
    box-sizing: border-box;
  }
  body {
    width: 76mm;
    font-family: 'Courier New', Courier, monospace;
    font-size: 9.5px;
    line-height: 1.25;
  }
  .line {
    display: block;
    width: 100%;
    overflow: hidden;
    white-space: pre;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }
  .line--bold   { font-weight: bold; }
  .line--large  { font-size: 16px; font-weight: bold; line-height: 1.35; }
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

    const classes = ['line'];
    if (line.bold) classes.push('line--bold');
    if (line.large) classes.push('line--large');
    if (line.inverse) classes.push('line--inverse');
    if (line.align === 'center') classes.push('line--center');
    else if (line.align === 'right') classes.push('line--right');

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
