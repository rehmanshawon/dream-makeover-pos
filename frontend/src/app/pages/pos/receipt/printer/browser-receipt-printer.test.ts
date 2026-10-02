import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserReceiptPrinter } from './browser-receipt-printer';
import type { ReceiptLine } from './receipt-printer';

describe('BrowserReceiptPrinter', () => {
  const originalOpen = window.open;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    window.open = originalOpen;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function mockPopup() {
    const pageStyle = { textContent: '' };
    return {
      document: {
        open: vi.fn(),
        write: vi.fn(),
        close: vi.fn(),
        body: {
          scrollHeight: 680,
          getBoundingClientRect: () => ({ top: 0 }),
          children: [{ getBoundingClientRect: () => ({ top: 48, bottom: 480 }) }],
        },
        head: { append: vi.fn() },
        createElement: vi.fn(() => pageStyle),
      },
      pageStyle,
      addEventListener: vi.fn(),
      focus: vi.fn(),
      print: vi.fn(),
      close: vi.fn(),
    };
  }

  it('opens a popup, writes the receipt, and calls print', async () => {
    const popup = mockPopup();
    window.open = vi.fn(() => popup) as unknown as typeof window.open;

    const printer = new BrowserReceiptPrinter();
    const lines: ReceiptLine[] = [
      { type: 'text', text: 'HELLO' },
      { type: 'text', text: 'WORLD' },
    ];
    const promise = printer.print(lines);

    await vi.advanceTimersByTimeAsync(200);
    await promise;

    expect(window.open).toHaveBeenCalled();
    expect(popup.document.write).toHaveBeenCalledOnce();
    const html = popup.document.write.mock.calls[0]?.[0] as string;
    expect(html).toContain('HELLO');
    expect(html).toContain('WORLD');
    expect(popup.print).toHaveBeenCalledOnce();
  });

  it('renders bold and large as classes', async () => {
    const popup = mockPopup();
    window.open = vi.fn(() => popup) as unknown as typeof window.open;

    const printer = new BrowserReceiptPrinter();
    const lines: ReceiptLine[] = [
      { type: 'text', text: 'HEADING', bold: true, large: true, align: 'center' },
    ];
    const promise = printer.print(lines);
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    const html = popup.document.write.mock.calls[0]?.[0] as string;
    expect(html).toContain('line--bold');
    expect(html).toContain('line--large');
    expect(html).toContain('line--center');
  });

  it('renders medium emphasized lines with the fixed-width style', async () => {
    const popup = mockPopup();
    window.open = vi.fn(() => popup) as unknown as typeof window.open;

    const printer = new BrowserReceiptPrinter();
    const promise = printer.print([{ type: 'text', text: 'TOTAL', bold: true, medium: true }]);
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    const html = popup.document.write.mock.calls[0]?.[0] as string;
    expect(html).toContain('line--medium');
    expect(html).toContain('width: 115.8%');
    expect(html).toContain('transform: scaleX(0.864)');
  });

  it('renders inverse as a class', async () => {
    const popup = mockPopup();
    window.open = vi.fn(() => popup) as unknown as typeof window.open;

    const printer = new BrowserReceiptPrinter();
    const promise = printer.print([{ type: 'text', text: 'TOTAL', inverse: true }]);
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    const html = popup.document.write.mock.calls[0]?.[0] as string;
    expect(html).toContain('line--inverse');
  });

  it('aligns total colons and only emphasizes Subtotal and Total Amount', async () => {
    const popup = mockPopup();
    window.open = vi.fn(() => popup) as unknown as typeof window.open;

    const printer = new BrowserReceiptPrinter();
    const promise = printer.print([
      { type: 'text', text: 'Subtotal        :                                        123.45', bold: true },
      { type: 'text', text: 'Total Amount    :                                         123.45', bold: true },
      { type: 'text', text: 'Paid Amount     :                                          50.00' },
    ]);
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    const html = popup.document.write.mock.calls[0]?.[0] as string;
    expect(html).toContain(
      '<div class="line line--bold line--total"><span>Subtotal</span><span class="line--colon">:</span><span class="line--total-value">123.45</span></div>',
    );
    expect(html).toContain(
      '<div class="line line--bold line--total"><span>Total Amount</span><span class="line--colon">:</span><span class="line--total-value">123.45</span></div>',
    );
    expect(html).toContain(
      '<div class="line line--total"><span>Paid Amount</span><span class="line--colon">:</span><span class="line--total-value">50.00</span></div>',
    );
  });

  it('renders item rows on one line at the previous size and in bold', async () => {
    const popup = mockPopup();
    window.open = vi.fn(() => popup) as unknown as typeof window.open;
    const itemRow = `${'1'.padEnd(3)} ${'Repair service'.padEnd(26)} ${'2'.padStart(5)}    ${'45.00'.padStart(12)} ${'90.00'.padStart(11)}`;

    const printer = new BrowserReceiptPrinter();
    const promise = printer.print([{ type: 'text', text: itemRow }]);
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    const html = popup.document.write.mock.calls[0]?.[0] as string;
    expect(html).toContain('class="line line--items line--item"');
    expect(html).toContain(
      '<span>1</span><span>Repair service</span><span>2</span><span>45.00</span><span>90.00</span>',
    );
    expect(html).toContain('font-size: 11px');
    expect(itemRow).toHaveLength(64);
  });

  it('renders invoice detail colons in aligned columns using regular weight', async () => {
    const popup = mockPopup();
    window.open = vi.fn(() => popup) as unknown as typeof window.open;

    const printer = new BrowserReceiptPrinter();
    const promise = printer.print([{ type: 'text', text: 'Invoice No      : INV-1001'.padEnd(64) }]);
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    const html = popup.document.write.mock.calls[0]?.[0] as string;
    expect(html).toContain('class="line line--label-value"');
    expect(html).toContain(
      '<span>Invoice No</span><span class="line--colon">:</span><span class="line--value">INV-1001</span>',
    );
  });

  it('renders payment details and divider rules in aligned full-width columns', async () => {
    const popup = mockPopup();
    window.open = vi.fn(() => popup) as unknown as typeof window.open;

    const printer = new BrowserReceiptPrinter();
    const promise = printer.print([
      { type: 'text', text: 'Payment Method  : Cash'.padEnd(64) },
      { type: 'text', text: '-'.repeat(64) },
    ]);
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    const html = popup.document.write.mock.calls[0]?.[0] as string;
    expect(html).toContain(
      '<span>Payment Method</span><span class="line--colon">:</span><span class="line--value">Cash</span>',
    );
    expect(html).toContain('.line--label-value { display: grid; grid-template-columns: 26mm 3mm minmax(0, 1fr);');
    expect(html).toContain('class="line line--divider"');
    expect(html).toContain('width: calc(100% + 4mm)');
    expect(html).toContain('border-bottom: 0.2mm solid #000');
    expect(html).toContain('.line--item-header { font-weight: 700; }');
  });

  it('renders images as img tags', async () => {
    const popup = mockPopup();
    window.open = vi.fn(() => popup) as unknown as typeof window.open;

    const printer = new BrowserReceiptPrinter();
    const promise = printer.print([{ type: 'image', src: '/logo.png', maxWidthDots: 192 }]);
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    const html = popup.document.write.mock.calls[0]?.[0] as string;
    expect(html).toContain('<img');
    expect(html).toContain('/logo.png');
  });

  it('aligns with the POS-80 page and waits for printing to finish before closing', async () => {
    const popup = mockPopup();
    const addEventListener = popup.addEventListener;
    window.open = vi.fn(() => popup) as unknown as typeof window.open;

    const printer = new BrowserReceiptPrinter();
    const promise = printer.print([{ type: 'text', text: 'RECEIPT' }]);
    await vi.advanceTimersByTimeAsync(1);
    await promise;

    const html = popup.document.write.mock.calls[0]?.[0] as string;
    expect(html).toContain('@page { size: 80mm auto; margin: 0; }');
    expect(html).toContain('width: 80mm');
    expect(html).toContain('min-height: 210mm');
    expect(html).not.toContain('margin-top: -12.7mm');
    expect(html).toContain('padding: 2mm 2mm');
    expect(html).toContain('font-size: 11px');
    expect(html).toContain('font-weight: 400');
    expect(html).toContain('font-family: Arial, Helvetica, sans-serif');
    expect(html).toContain('.line--fixed  { width: 100%; font-family: Arial, Helvetica, sans-serif; font-size: 9px; font-weight: 400; }');
    expect(html).not.toContain('-webkit-text-stroke');
    expect(html).not.toContain('scaleX(0.68)');
    expect(popup.pageStyle.textContent).toBe('@page { size: 80mm 210mm; margin: 0; }');
    expect(addEventListener).toHaveBeenCalledWith('afterprint', expect.any(Function), {
      once: true,
    });
    expect(popup.close).not.toHaveBeenCalled();
  });

  it('throws when the popup is blocked', async () => {
    window.open = vi.fn(() => null) as unknown as typeof window.open;

    const printer = new BrowserReceiptPrinter();
    await expect(printer.print([{ type: 'text', text: 'x' }])).rejects.toThrow(
      /popups are allowed/i,
    );
  });

  it('escapes HTML in text lines', async () => {
    const popup = mockPopup();
    window.open = vi.fn(() => popup) as unknown as typeof window.open;

    const printer = new BrowserReceiptPrinter();
    const promise = printer.print([{ type: 'text', text: '<script>alert("x")</script>' }]);
    await vi.advanceTimersByTimeAsync(200);
    await promise;

    const html = popup.document.write.mock.calls[0]?.[0] as string;
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert');
  });
});
