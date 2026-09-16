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

    // Let the popup render (including any images) before invoking print.
    await new Promise((resolve) => setTimeout(resolve, 150));

    try {
      popup.focus();
      popup.print();
    } catch {
      popup.close();
      throw new Error('Printing was blocked or failed');
    }

    setTimeout(() => {
      try {
        popup.close();
      } catch {
        // Ignore; the popup may already be closed.
      }
    }, 500);
  }

  private buildHtml(lines: ReceiptLine[]): string {
    const body = lines.map((line) => this.renderLine(line)).join('');
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Receipt</title>
<style>
  @page { margin: 4mm; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
  }
  body {
    padding: 8px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    line-height: 1.3;
  }
  .line {
    white-space: pre;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }
  .line--bold   { font-weight: bold; }
  .line--large  { font-size: 18px; font-weight: bold; line-height: 1.4; }
  .line--center { text-align: center; }
  .line--right  { text-align: right; }
  .line--inverse {
    background: #000;
    color: #fff;
    padding: 2px 4px;
  }
  .line--image  { text-align: center; margin: 6px 0; }
  .line--image img { max-width: 180px; height: auto; }
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
