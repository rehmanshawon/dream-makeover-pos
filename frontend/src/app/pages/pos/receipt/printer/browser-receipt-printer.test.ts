import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserReceiptPrinter } from './browser-receipt-printer';

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

  function mockPopup(): {
    document: {
      open: ReturnType<typeof vi.fn>;
      write: ReturnType<typeof vi.fn>;
      close: ReturnType<typeof vi.fn>;
    };
    focus: ReturnType<typeof vi.fn>;
    print: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  } {
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
    const promise = printer.print(['HELLO', 'WORLD']);

    // Resolve the internal setTimeout
    await vi.advanceTimersByTimeAsync(100);

    await promise;

    expect(window.open).toHaveBeenCalled();
    expect(popup.document.write).toHaveBeenCalledOnce();
    const html = popup.document.write.mock.calls[0]?.[0] as string;
    expect(html).toContain('HELLO');
    expect(html).toContain('WORLD');
    expect(popup.print).toHaveBeenCalledOnce();
  });

  it('throws when the popup is blocked', async () => {
    window.open = vi.fn(() => null) as unknown as typeof window.open;

    const printer = new BrowserReceiptPrinter();
    await expect(printer.print(['x'])).rejects.toThrow(/popups are allowed/i);
  });

  it('escapes HTML in receipt lines', async () => {
    const popup = mockPopup();
    window.open = vi.fn(() => popup) as unknown as typeof window.open;

    const printer = new BrowserReceiptPrinter();
    const promise = printer.print(['<script>alert("x")</script>']);
    await vi.advanceTimersByTimeAsync(100);
    await promise;

    const html = popup.document.write.mock.calls[0]?.[0] as string;
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert');
  });
});
