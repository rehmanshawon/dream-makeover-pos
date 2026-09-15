import type { ReceiptPrinter } from './receipt-printer';

/**
 * Prints receipts using the browser's print dialog.
 *
 * This implementation opens a minimal popup window with the receipt as
 * pre-formatted monospace text, triggers the browser print flow, then
 * closes the window. It works with any printer installed on the
 * operating system, including a USB thermal printer with a vendor
 * driver.
 *
 * It is not the final solution. On Windows, we will replace this with a
 * direct ESC/POS implementation that bypasses the browser dialog
 * entirely.
 */
export class BrowserReceiptPrinter implements ReceiptPrinter {
  readonly name = 'Browser print';

  async print(lines: string[]): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Browser printing requires a window environment');
    }

    const popup = window.open('', 'receipt', 'width=420,height=640');
    if (!popup) {
      throw new Error('Unable to open print window. Check that popups are allowed.');
    }

    try {
      popup.document.open();
      popup.document.write(this.buildHtml(lines));
      popup.document.close();
    } catch (err) {
      popup.close();
      throw new Error('Unable to prepare the print window');
    }

    // Give the popup a moment to render before invoking print.
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      popup.focus();
      popup.print();
    } catch (err) {
      popup.close();
      throw new Error('Printing was blocked or failed');
    }

    // Closing after print may race with the print dialog on some
    // browsers. We wait a bit longer and then attempt to close.
    // If the user cancelled the dialog, the popup remains and they can
    // close it manually.
    setTimeout(() => {
      try {
        popup.close();
      } catch {
        // Ignore; the popup may already be closed.
      }
    }, 500);
  }

  private buildHtml(lines: string[]): string {
    const escaped = lines.map(escapeHtml).join('\n');

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
  }
  body {
    padding: 8px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    line-height: 1.25;
    color: #000;
  }
  pre {
    margin: 0;
    white-space: pre;
    font-family: inherit;
    font-size: inherit;
  }
</style>
</head>
<body><pre>${escaped}</pre></body>
</html>`;
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
