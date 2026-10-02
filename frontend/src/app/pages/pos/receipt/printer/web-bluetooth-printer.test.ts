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

function mockBluetooth(serviceUuid: string) {
  let disconnectListener: (() => void) | undefined;
  const write = vi.fn().mockResolvedValue(undefined);
  const characteristic = {
    uuid: '00002af1-0000-1000-8000-00805f9b34fb',
    properties: { write: true, writeWithoutResponse: false },
    writeValueWithResponse: write,
  };
  const service = { getCharacteristics: vi.fn().mockResolvedValue([characteristic]) };
  const server = {
    connected: true,
    getPrimaryServices: vi.fn().mockResolvedValue([{ uuid: serviceUuid }]),
    getPrimaryService: vi.fn(async (uuid: string) => {
      if (uuid !== serviceUuid) throw new Error('Service not found');
      return service;
    }),
  };
  const device = {
    id: 'test-device',
    gatt: {
      connect: vi.fn().mockImplementation(async () => {
        server.connected = true;
        return server;
      }),
      disconnect: vi.fn(),
    },
    addEventListener: vi.fn((_event: string, listener: () => void) => {
      disconnectListener = listener;
    }),
  };
  const requestDevice = vi.fn().mockResolvedValue(device);
  Object.defineProperty(navigator, 'bluetooth', {
    configurable: true,
    value: { requestDevice },
  });

  return {
    requestDevice,
    device,
    server,
    write,
    disconnect: () => disconnectListener?.(),
  };
}

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
    Object.assign(printer, {
      printer: {
        characteristic: {
          properties: { write: true, writeWithoutResponse: false },
          writeValueWithResponse: write,
        },
      },
    });

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
    Object.assign(printer, {
      printer: {
        characteristic: {
          properties: { write: true, writeWithoutResponse: false },
          writeValueWithResponse: write,
        },
      },
    });

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

  it('connects through alternate printer services and reconnects after disconnect', async () => {
    const bluetooth = mockBluetooth('e7810a71-73ae-499d-8c15-faa9aef0c3f2');
    const printer = new WebBluetoothReceiptPrinter();

    await printer.connect();
    bluetooth.disconnect();
    await printer.print([{ type: 'text', text: 'RECEIPT' }]);

    expect(bluetooth.requestDevice).toHaveBeenCalledTimes(2);
    expect(bluetooth.write).toHaveBeenCalledTimes(3);
  });

  it('rejects a selected device without a writable printer characteristic', async () => {
    const bluetooth = mockBluetooth('e7810a71-73ae-499d-8c15-faa9aef0c3f2');
    bluetooth.server.getPrimaryService.mockImplementation(async () => ({
      getCharacteristics: vi.fn().mockResolvedValue([
        {
          uuid: '00002af1-0000-1000-8000-00805f9b34fb',
          properties: { write: false, writeWithoutResponse: false },
        },
      ]),
    }));
    const printer = new WebBluetoothReceiptPrinter();

    await expect(printer.connect()).rejects.toThrow(
      'Exposed services: e7810a71-73ae-499d-8c15-faa9aef0c3f2',
    );
    expect((await bluetooth.requestDevice.mock.results[0]!.value).gatt.disconnect).toHaveBeenCalled();
    expect(bluetooth.write).not.toHaveBeenCalled();
  });

  it('reconnects once when the GATT server drops during discovery', async () => {
    const bluetooth = mockBluetooth('e7810a71-73ae-499d-8c15-faa9aef0c3f2');
    bluetooth.server.getPrimaryServices.mockImplementationOnce(async () => {
      bluetooth.server.connected = false;
      throw new DOMException('GATT Server is disconnected.', 'NetworkError');
    });
    const printer = new WebBluetoothReceiptPrinter();

    await printer.connect();

    expect(bluetooth.device.gatt.connect).toHaveBeenCalledTimes(2);
  });

  it('asks the user to select from the configured printer services', async () => {
    const bluetooth = mockBluetooth('000018f0-0000-1000-8000-00805f9b34fb');
    const printer = new WebBluetoothReceiptPrinter();

    await printer.connect();

    expect(bluetooth.requestDevice).toHaveBeenCalledWith({
      filters: expect.arrayContaining([
        { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
        { services: ['49535343-fe7d-4ae5-8fa9-9fafd205e455'] },
        { services: ['e7810a71-73ae-499d-8c15-faa9aef0c3f2'] },
      ]),
      optionalServices: expect.arrayContaining([
        '000018f0-0000-1000-8000-00805f9b34fb',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
      ]),
    });
  });
});
