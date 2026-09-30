import { beforeEach, describe, expect, it, vi } from 'vitest';

const { encodedTexts } = vi.hoisted(() => ({ encodedTexts: [] as string[] }));

vi.mock('@point-of-sale/receipt-printer-encoder', () => ({
  default: class {
    initialize() {
      return this;
    }
    codepage(_name: string) {
      return this;
    }
    align(_alignment: string) {
      return this;
    }
    bold(_enabled: boolean) {
      return this;
    }
    size(_width: number, _height: number) {
      return this;
    }
    invert(_enabled: boolean) {
      return this;
    }
    text(value: string) {
      encodedTexts.push(value);
      return this;
    }
    newline() {
      return this;
    }
    cut() {
      return this;
    }
    encode() {
      return new Uint8Array();
    }
  },
}));

import { WebBluetoothReceiptPrinter } from './web-bluetooth-printer';

describe('WebBluetoothReceiptPrinter', () => {
  beforeEach(() => {
    encodedTexts.length = 0;
  });

  it('sends receipt lines in their formatted order', async () => {
    const printer = new WebBluetoothReceiptPrinter();
    const write = vi.fn().mockResolvedValue(undefined);
    Object.assign(printer, { printer: { print: write } });

    await printer.print([
      { type: 'text', text: 'CASH RECEIPT' },
      { type: 'text', text: 'ITEM' },
      { type: 'text', text: 'THANK YOU' },
    ]);

    expect(encodedTexts).toEqual(['CASH RECEIPT', 'ITEM', 'THANK YOU']);
    expect(write).toHaveBeenCalledOnce();
  });
});
