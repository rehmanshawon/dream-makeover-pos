import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';
import type { ReceiptImageLine, ReceiptLine, ReceiptPrinter } from './receipt-printer';
import {
  PRINTER_SERVICE_UUIDS,
  PRINTER_FEED_BEFORE_CUT,
  PRINTER_PAPER_WIDTH,
  PRINTER_DEVICE_STORAGE_KEY,
} from './printer-config';

type BluetoothPrinter = {
  device: BluetoothDevice;
  characteristic: BluetoothCharacteristic;
};

type BluetoothCharacteristic = {
  uuid: string;
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValueWithResponse?: (data: Uint8Array) => Promise<void>;
  writeValueWithoutResponse?: (data: Uint8Array) => Promise<void>;
};

type BluetoothService = {
  uuid: string;
  getCharacteristics: () => Promise<BluetoothCharacteristic[]>;
};

type BluetoothGattServer = {
  connected: boolean;
  getPrimaryService: (uuid: string) => Promise<BluetoothService>;
  getPrimaryServices: () => Promise<BluetoothService[]>;
};

type BluetoothDevice = {
  id: string;
  gatt: {
    connect: () => Promise<BluetoothGattServer>;
    disconnect: () => void;
  };
  addEventListener: (event: 'gattserverdisconnected', listener: () => void) => void;
};

type BluetoothApi = {
  requestDevice: (options: {
    filters: Array<{ services: string[] }>;
    optionalServices: string[];
  }) => Promise<BluetoothDevice>;
};

const DEFAULT_IMAGE_WIDTH_DOTS = 256;
const PRINTER_CHARACTER_WIDTH_DOTS = 12;
const PRINTER_STANDARD_LINE_HEIGHT_DOTS = 24;
const MEDIUM_LINE_HEIGHT_SCALE = 1.5;
const BLUETOOTH_CHUNK_SIZE = 100;
const BLUETOOTH_CHUNK_DELAY_MS = 30;

async function discoverPrinterCharacteristic(server: BluetoothGattServer): Promise<{
  characteristic: BluetoothCharacteristic | undefined;
  exposedServices: string;
  serviceDiagnostics: string[];
}> {
  let characteristic: BluetoothCharacteristic | undefined;
  let exposedServices: string;
  const serviceDiagnostics: string[] = [];

  try {
    exposedServices = (await server.getPrimaryServices()).map((service) => service.uuid).join(', ');
    if (!exposedServices) exposedServices = 'none';
  } catch (error) {
    exposedServices = `enumeration failed (${error instanceof Error ? `${error.name}: ${error.message}` : String(error)})`;
  }

  for (const serviceUuid of PRINTER_SERVICE_UUIDS) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      const characteristics = await service.getCharacteristics();
      serviceDiagnostics.push(
        `${serviceUuid}: ${
          characteristics.length
            ? characteristics
                .map(
                  (item) =>
                    `${item.uuid} [write=${item.properties.write}, writeWithoutResponse=${item.properties.writeWithoutResponse}]`,
                )
                .join(', ')
            : 'no characteristics'
        }`,
      );
      characteristic =
        characteristics.find((item) => item.properties.write && item.writeValueWithResponse) ??
        characteristics.find(
          (item) => item.properties.writeWithoutResponse && item.writeValueWithoutResponse,
        );
      if (characteristic) break;
    } catch (error) {
      serviceDiagnostics.push(
        `${serviceUuid}: unavailable (${error instanceof Error ? `${error.name}: ${error.message}` : String(error)})`,
      );
    }
  }

  return { characteristic, exposedServices, serviceDiagnostics };
}

/**
 * Prints receipts over Bluetooth Low Energy using the Web Bluetooth API.
 *
 * Requires a Chromium-based browser (Chrome, Edge, Opera). Firefox and
 * Safari do not support Web Bluetooth.
 *
 * The printer must be paired once from a user gesture. After pairing,
 * the device ID is stored in localStorage for status display.
 */
export class WebBluetoothReceiptPrinter implements ReceiptPrinter {
  readonly name = 'Dotmax POS 8360L (Bluetooth)';

  private printer: BluetoothPrinter | null = null;

  async connect(): Promise<string> {
    const bluetooth = (navigator as Navigator & { bluetooth?: BluetoothApi }).bluetooth;
    if (!bluetooth) {
      throw new Error(
        'Web Bluetooth is not available in this browser. Use Chrome, Edge, or Opera.',
      );
    }

    const device = await bluetooth.requestDevice({
      filters: PRINTER_SERVICE_UUIDS.map((service) => ({ services: [service] })),
      optionalServices: PRINTER_SERVICE_UUIDS,
    });
    let server = await device.gatt.connect();
    let discovery = await discoverPrinterCharacteristic(server);

    if (!server.connected) {
      server = await device.gatt.connect();
      discovery = await discoverPrinterCharacteristic(server);
    }

    if (!server.connected) {
      device.gatt.disconnect();
      throw new Error(
        'The Bluetooth connection dropped during printer discovery. Keep the printer powered on and disconnect other devices before trying again.',
      );
    }

    if (!discovery.characteristic) {
      device.gatt.disconnect();
      throw new Error(
        `The selected printer has no writable receipt service. Exposed services: ${discovery.exposedServices}. Configured checks: ${discovery.serviceDiagnostics.join('; ')}`,
      );
    }

    const printer = { device, characteristic: discovery.characteristic };
    device.addEventListener('gattserverdisconnected', () => {
      if (this.printer?.device === device) this.printer = null;
    });
    this.printer = printer;
    this.storeDeviceId(device.id);
    return device.id;
  }

  async print(lines: ReceiptLine[]): Promise<void> {
    if (!this.printer) {
      await this.connect();
    }

    const encoder = new ReceiptPrinterEncoder({
      language: 'esc-pos',
      width: PRINTER_PAPER_WIDTH,
      imageMode: 'raster',
      feedBeforeCut: PRINTER_FEED_BEFORE_CUT,
    })
      .initialize()
      .codepage('auto')
      .font('B');

    for (const line of lines) {
      await this.appendLine(encoder, line);
    }

    encoder.cut();

    const data = encoder.encode();
    for (let offset = 0; offset < data.length; offset += BLUETOOTH_CHUNK_SIZE) {
      const characteristic = this.printer!.characteristic;
      const chunk = data.slice(offset, offset + BLUETOOTH_CHUNK_SIZE);
      if (characteristic.properties.write && characteristic.writeValueWithResponse) {
        await characteristic.writeValueWithResponse(chunk);
      } else if (
        characteristic.properties.writeWithoutResponse &&
        characteristic.writeValueWithoutResponse
      ) {
        await characteristic.writeValueWithoutResponse(chunk);
      } else {
        throw new Error('The printer disconnected before the receipt finished printing.');
      }
      if (offset + BLUETOOTH_CHUNK_SIZE < data.length) {
        await new Promise((resolve) => setTimeout(resolve, BLUETOOTH_CHUNK_DELAY_MS));
      }
    }
  }

  /**
   * Appends a single structured line to the encoder.
   *
   * The encoder object is stateful: alignment, bold, size, and invert
   * modes persist until explicitly changed. We always reset each
   * modifier before applying the next line's intent so lines do not
   * bleed into one another.
   */
  private async appendLine(encoder: ReceiptPrinterEncoder, line: ReceiptLine): Promise<void> {
    // Reset modifiers from the previous line.
    encoder.align('left').bold(false).size(1, 1).invert(false);

    if (line.type === 'image') {
      await this.appendImage(encoder, line);
      return;
    }

    if (line.align === 'center') encoder.align('center');
    else if (line.align === 'right') encoder.align('right');

    if (line.medium) {
      this.appendMediumText(encoder, line);
      return;
    }

    if (line.bold) encoder.bold(true);
    if (line.large) {
      encoder.size(2, 2);
    }
    if (line.inverse) encoder.invert(true);

    encoder.text(line.text);

    if (line.inverse) encoder.invert(false);
    if (line.bold) encoder.bold(false);

    encoder.newline();
  }

  private appendMediumText(
    encoder: ReceiptPrinterEncoder,
    line: Extract<ReceiptLine, { type: 'text' }>,
  ): void {
    const canvas = document.createElement('canvas');
    canvas.width = PRINTER_PAPER_WIDTH * PRINTER_CHARACTER_WIDTH_DOTS;
    canvas.height = Math.round(PRINTER_STANDARD_LINE_HEIGHT_DOTS * MEDIUM_LINE_HEIGHT_SCALE);
    const context = canvas.getContext('2d');

    if (!context) {
      if (line.bold) encoder.bold(true);
      encoder.text(line.text).newline();
      if (line.bold) encoder.bold(false);
      return;
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#000000';
    context.font = `${line.bold ? 'bold ' : ''}${PRINTER_STANDARD_LINE_HEIGHT_DOTS}px "Courier New", Courier, monospace`;
    context.textBaseline = 'middle';

    const characterWidth = context.measureText('M').width;
    const targetCharacterWidth =
      (PRINTER_PAPER_WIDTH * PRINTER_CHARACTER_WIDTH_DOTS) / line.text.length;
    const horizontalScale = characterWidth > 0 ? targetCharacterWidth / characterWidth : 1;
    const textWidth = context.measureText(line.text).width * horizontalScale;
    const left =
      line.align === 'right'
        ? canvas.width - textWidth
        : line.align === 'center'
          ? (canvas.width - textWidth) / 2
          : 0;

    context.save();
    context.translate(left, 0);
    context.scale(horizontalScale, MEDIUM_LINE_HEIGHT_SCALE);
    context.fillText(line.text, 0, PRINTER_STANDARD_LINE_HEIGHT_DOTS / 2);
    context.restore();

    encoder.align('left').image(canvas, {
      width: canvas.width,
      height: canvas.height,
      algorithm: 'threshold',
      threshold: 160,
    });
    encoder.align('left');
  }

  /**
   * Loads an image, scales it to the printer's dot width, inverts its
   * tones so dark backgrounds become light, and emits it as an ESC/POS
   * bitmap.
   */
  private async appendImage(encoder: ReceiptPrinterEncoder, line: ReceiptImageLine): Promise<void> {
    if (typeof Image === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const maxDots = line.maxWidthDots ?? DEFAULT_IMAGE_WIDTH_DOTS;

    const image = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = line.src;
    });
    if (!image) return;

    const scale = Math.min(1, maxDots / image.width);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Invert the image so dark backgrounds become white. The Dotmax
    // logo has a black disk; without inversion it would print as a
    // solid black rectangle on thermal paper.
    ctx.filter = 'invert(1)';
    ctx.drawImage(image, 0, 0, width, height);
    ctx.filter = 'none';

    encoder.align('center').image(canvas, {
      width: canvas.width,
      height: canvas.height,
      algorithm: 'threshold',
      threshold: 160,
    });
    encoder.align('left').newline();
  }

  hasStoredDevice(): boolean {
    return this.getStoredDeviceId() !== null;
  }

  private storeDeviceId(id: string): void {
    try {
      window.localStorage.setItem(PRINTER_DEVICE_STORAGE_KEY, id);
    } catch {
      // Storage may be unavailable; ignore.
    }
  }

  private getStoredDeviceId(): string | null {
    try {
      return window.localStorage.getItem(PRINTER_DEVICE_STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
