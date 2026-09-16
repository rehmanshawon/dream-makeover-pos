/**
 * A receipt is a sequence of structured lines. Each line is either text
 * with styling intent, or an image.
 *
 * Printer implementations translate this structure into their own
 * medium:
 *   - ESC/POS bytes for a thermal printer
 *   - HTML for the browser print dialog
 *   - A structured array for tests
 *
 * The formatter produces this structure. It does not know how it will
 * be printed.
 */

export type ReceiptAlign = 'left' | 'center' | 'right';

export interface ReceiptTextLine {
  type: 'text';
  text: string;
  /** Render bold. ESC/POS: ESC E 1 ... ESC E 0. HTML: font-weight bold. */
  bold?: boolean;
  /** Render larger. ESC/POS: GS ! (double height + width). HTML: larger font. */
  large?: boolean;
  /** Inverse (white on black). ESC/POS: GS B 1 ... GS B 0. HTML: dark background. */
  inverse?: boolean;
  /** Horizontal alignment. Default: left. */
  align?: ReceiptAlign;
}

export interface ReceiptImageLine {
  type: 'image';
  /** URL or path to the image. Loaded at print time. */
  src: string;
  /**
   * Maximum width in printer dots. The image is scaled down to fit
   * this width; height scales proportionally. Default: 256 dots.
   */
  maxWidthDots?: number;
}

export type ReceiptLine = ReceiptTextLine | ReceiptImageLine;

/**
 * A printer capable of producing a receipt from a structured stream of
 * lines.
 */
export interface ReceiptPrinter {
  /** Human-readable name shown in error messages and status UI. */
  readonly name: string;

  /**
   * Prints the given lines. Resolves on success, rejects on failure.
   *
   * Implementations may need a user gesture (Web Bluetooth) or a
   * prepared document (browser print).
   */
  print(lines: ReceiptLine[]): Promise<void>;
}
