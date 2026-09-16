import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';
import type { ReceiptImageLine, ReceiptLine, ReceiptPrinter } from './receipt-printer';
import {
  PRINTER_FEED_BEFORE_CUT,
  PRINTER_PAPER_WIDTH,
  PRINTER_DEVICE_STORAGE_KEY,
} from './printer-config';

type BluetoothPrinter = {
  connect: () => Promise<unknown>;
  print: (data: unknown) => Promise<unknown>;
  device?: { id?: string };
};

const DEFAULT_IMAGE_WIDTH_DOTS = 256;

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
    const bluetooth = (navigator as Navigator & { bluetooth?: unknown }).bluetooth;
    if (!bluetooth) {
      throw new Error(
        'Web Bluetooth is not available in this browser. Use Chrome, Edge, or Opera.',
      );
    }

    const { default: WebBluetoothReceiptPrinterClass } =
      await import('@point-of-sale/webbluetooth-receipt-printer');
    const printer: BluetoothPrinter = new WebBluetoothReceiptPrinterClass();
    await printer.connect();

    this.printer = printer;
    const deviceId = printer.device?.id;
    if (typeof deviceId === 'string') {
      this.storeDeviceId(deviceId);
      return deviceId;
    }
    return 'connected';
  }

  async print(lines: ReceiptLine[]): Promise<void> {
    if (!this.printer) {
      await this.connect();
    }

    const encoder = new ReceiptPrinterEncoder({
      language: 'esc-pos',
      width: PRINTER_PAPER_WIDTH,
    })
      .initialize()
      .codepage('auto');

    for (const line of lines) {
      await this.appendLine(encoder, line);
    }

    encoder.newline().newline().cut();

    await this.printer!.print(encoder.encode());
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
    encoder.align('left').bold(false).size('normal').invert(false);

    if (line.type === 'image') {
      await this.appendImage(encoder, line);
      return;
    }

    if (line.align === 'center') encoder.align('center');
    else if (line.align === 'right') encoder.align('right');

    if (line.bold) encoder.bold(true);
    if (line.large) encoder.size('double');
    if (line.inverse) encoder.invert(true);

    encoder.text(line.text);

    if (line.inverse) encoder.invert(false);
    if (line.large) encoder.size('normal');
    if (line.bold) encoder.bold(false);

    encoder.newline();
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

    if (PRINTER_FEED_BEFORE_CUT > 0) {
      // Feed one blank line after the logo for spacing.
      encoder.newline();
    }
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
