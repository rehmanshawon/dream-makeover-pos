import type { ReceiptPrinter } from './receipt-printer';
import { BrowserReceiptPrinter } from './browser-receipt-printer';
import { WebBluetoothReceiptPrinter } from './web-bluetooth-printer';

function createDefaultPrinter(): ReceiptPrinter {
  if (typeof navigator !== 'undefined' && /Electron\//i.test(navigator.userAgent)) {
    return new BrowserReceiptPrinter();
  }

  const bluetooth = (navigator as Navigator & { bluetooth?: unknown }).bluetooth;
  return bluetooth ? new WebBluetoothReceiptPrinter() : new BrowserReceiptPrinter();
}

let current: ReceiptPrinter = createDefaultPrinter();

/**
 * Registers a printer implementation for the application to use.
 *
 * Called during bootstrap to install the platform-specific printer, or
 * during tests to install a mock.
 */
export function setReceiptPrinter(printer: ReceiptPrinter): void {
  current = printer;
}

/**
 * Returns the currently installed printer.
 *
 * Electron uses the operating system print dialog; browsers use Web Bluetooth
 * when available and otherwise use the browser print dialog.
 */
export function getReceiptPrinter(): ReceiptPrinter {
  return current;
}

/**
 * Restores the default browser printer.
 *
 * Used by tests to avoid leaking a mock into the next test.
 */
export function resetReceiptPrinter(): void {
  current = createDefaultPrinter();
}
