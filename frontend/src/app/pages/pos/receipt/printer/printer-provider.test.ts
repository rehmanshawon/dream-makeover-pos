import { afterEach, describe, expect, it } from 'vitest';
import { getReceiptPrinter, resetReceiptPrinter, setReceiptPrinter } from './printer-provider';
import { MockReceiptPrinter } from './mock-receipt-printer';
import { BrowserReceiptPrinter } from './browser-receipt-printer';

describe('printer provider', () => {
  const originalUserAgent = navigator.userAgent;
  const originalBluetooth = Object.getOwnPropertyDescriptor(navigator, 'bluetooth');

  afterEach(() => {
    resetReceiptPrinter();
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    });
    if (originalBluetooth) Object.defineProperty(navigator, 'bluetooth', originalBluetooth);
    else Reflect.deleteProperty(navigator, 'bluetooth');
  });

  it('returns the browser printer by default', () => {
    resetReceiptPrinter();
    expect(getReceiptPrinter()).toBeInstanceOf(BrowserReceiptPrinter);
  });

  it('uses the Windows print dialog in Electron even when Web Bluetooth is available', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: `${originalUserAgent} Electron/44.5.1`,
    });
    Object.defineProperty(navigator, 'bluetooth', { configurable: true, value: {} });

    resetReceiptPrinter();

    expect(getReceiptPrinter()).toBeInstanceOf(BrowserReceiptPrinter);
  });

  it('returns the installed printer after set', () => {
    const mock = new MockReceiptPrinter();
    setReceiptPrinter(mock);
    expect(getReceiptPrinter()).toBe(mock);
  });

  it('restores the browser printer on reset', () => {
    setReceiptPrinter(new MockReceiptPrinter());
    resetReceiptPrinter();
    expect(getReceiptPrinter()).toBeInstanceOf(BrowserReceiptPrinter);
  });
});
