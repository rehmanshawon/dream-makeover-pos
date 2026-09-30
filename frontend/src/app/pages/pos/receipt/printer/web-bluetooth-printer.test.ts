import { beforeEach, describe, expect, it, vi } from 'vitest';

const { encodedTexts, encodedImages, encodedNewlines, encodedFonts, encoderOptions } = vi.hoisted(
  () => ({
    encodedTexts: [] as string[],
    encodedImages: [] as { width: number; height: number }[],
    encodedNewlines: { count: 0 },
    encodedFonts: [] as string[],
    encoderOptions: { imageMode: '', feedBeforeCut: 0 },
  }),
);

vi.mock('@point-of-sale/receipt-printer-encoder', () => ({
  default: class {
    constructor(options: { imageMode: string; feedBeforeCut: number }) {
      encoderOptions.imageMode = options.imageMode;
      encoderOptions.feedBeforeCut = options.feedBeforeCut;
    }
    initialize() {
      return this;
    }
    codepage(_name: string) {
      return this;
    }
    font(value: string) {
      encodedFonts.push(value);
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
    image(canvas: HTMLCanvasElement) {
      encodedImages.push({ width: canvas.width, height: canvas.height });
      return this;
    }
    newline() {
      encodedNewlines.count += 1;
      return this;
    }
    cut() {
      return this;
    }
    encode() {
      return Uint8Array.from({ length: 250 }, (_, index) => index);
    }
  },
}));

import { WebBluetoothReceiptPrinter } from './web-bluetooth-printer';

describe('WebBluetoothReceiptPrinter', () => {
  beforeEach(() => {
    encodedTexts.length = 0;
    encodedImages.length = 0;
    encodedNewlines.count = 0;
    encodedFonts.length = 0;
    encoderOptions.imageMode = '';
    encoderOptions.feedBeforeCut = 0;
  });

  it('sends receipt lines in their formatted order', async () => {
    const printer = new WebBluetoothReceiptPrinter();
    const write = vi.fn().mockResolvedValue(undefined);
    Object.assign(printer, { printer: { print: write } });

    await printer.print([
      { type: 'text', text: 'CASH RECEIPT', align: 'center' },
      { type: 'text', text: 'ITEM' },
      { type: 'text', text: 'THANK YOU', align: 'center' },
    ]);

    expect(encodedTexts).toEqual(['CASH RECEIPT', 'ITEM', 'THANK YOU']);
    expect(encoderOptions.feedBeforeCut).toBe(4);
    expect(encodedFonts).toEqual(['B']);
    const chunks = write.mock.calls.map(([chunk]) => chunk as Uint8Array);
    expect(chunks.map((chunk) => chunk.length)).toEqual([100, 100, 50]);
    expect(Array.from(chunks.flatMap((chunk) => Array.from(chunk)))).toEqual(
      Array.from({ length: 250 }, (_, index) => index),
    );
  });

  it('prints emphasized totals as a 1.5x-high bitmap at the original paper width', async () => {
    const context = {
      fillStyle: '',
      font: '',
      textBaseline: '',
      fillRect: vi.fn(),
      measureText: vi.fn(() => ({ width: 12 })),
      save: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );

    const printer = new WebBluetoothReceiptPrinter();
    const write = vi.fn().mockResolvedValue(undefined);
    Object.assign(printer, { printer: { print: write } });

    await printer.print([
      { type: 'text', text: 'Subtotal'.padEnd(64), bold: true, medium: true },
      { type: 'text', text: 'ordinary row' },
    ]);

    expect(encodedImages).toEqual([{ width: 576, height: 36 }]);
    expect(encodedTexts).toEqual(['ordinary row']);
    expect(context.scale).toHaveBeenCalledWith(0.75, 1.5);
    expect(encodedNewlines.count).toBe(1);
    expect(encoderOptions.imageMode).toBe('raster');
    expect(write).toHaveBeenCalledTimes(3);
  });
});
