/**
 * A printer capable of producing a receipt from pre-formatted lines.
 *
 * The interface is deliberately narrow: it takes an array of strings
 * (each at most 32 characters, one per receipt line) and prints them.
 *
 * Implementations:
 * - BrowserReceiptPrinter — uses the browser print dialog
 * - MockReceiptPrinter — records calls for tests
 *
 * A future Electron implementation will talk to a USB ESC/POS printer
 * directly. Because the interface takes formatted lines, that
 * implementation does not need to know how the lines were produced.
 */
export interface ReceiptPrinter {
  /**
   * A human-readable name for the printer, shown in UI error messages.
   */
  readonly name: string;

  /**
   * Prints the receipt.
   *
   * Resolves when printing is complete. Rejects if the operation fails.
   */
  print(lines: string[]): Promise<void>;
}
