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
    return {
      document: { open: vi.fn(), write: vi.fn(), close: vi.fn() },
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
