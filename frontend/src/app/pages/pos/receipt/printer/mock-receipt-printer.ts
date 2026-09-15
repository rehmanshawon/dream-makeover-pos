import type { ReceiptPrinter } from './receipt-printer';

/**
 * Records every print call for inspection in tests.
 *
 * A test can set an optional `failWith` error to simulate a printer
 * failure.
 */
export class MockReceiptPrinter implements ReceiptPrinter {
  readonly name = 'Mock printer';
  readonly printed: string[][] = [];
  failWith: Error | null = null;

  async print(lines: string[]): Promise<void> {
    if (this.failWith) {
      throw this.failWith;
    }
    this.printed.push([...lines]);
  }
}
