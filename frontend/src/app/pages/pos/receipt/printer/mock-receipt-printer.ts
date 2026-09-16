import type { ReceiptLine, ReceiptPrinter } from './receipt-printer';

/**
 * Records every print call for inspection in tests.
 *
 * A test can set an optional `failWith` error to simulate a printer
 * failure.
 */
export class MockReceiptPrinter implements ReceiptPrinter {
  readonly name = 'Mock printer';
  readonly printed: ReceiptLine[][] = [];
  failWith: Error | null = null;

  async print(lines: ReceiptLine[]): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.printed.push([...lines]);
  }
}
