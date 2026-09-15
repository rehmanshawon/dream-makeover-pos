import type { ReceiptPrinter } from './receipt-printer';
import { BrowserReceiptPrinter } from './browser-receipt-printer';

let current: ReceiptPrinter = new BrowserReceiptPrinter();

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
 * The default is the browser-based printer. That is a development
 * placeholder. On Windows, we install an ESC/POS implementation.
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
  current = new BrowserReceiptPrinter();
}
