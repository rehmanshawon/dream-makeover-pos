import { afterEach, describe, expect, it } from 'vitest';
import { getReceiptPrinter, resetReceiptPrinter, setReceiptPrinter } from './printer-provider';
import { MockReceiptPrinter } from './mock-receipt-printer';
import { BrowserReceiptPrinter } from './browser-receipt-printer';

describe('printer provider', () => {
  afterEach(() => {
    resetReceiptPrinter();
  });

  it('returns the browser printer by default', () => {
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
