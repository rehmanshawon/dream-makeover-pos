/**
 * Bluetooth service UUIDs that identify a printable printer.
 *
 * Discovered from the Dotmax POS 8360L:
 *   - 0000180a-...  Device Information (read-only)
 *   - 000018f0-...  Standard ESC/POS BLE printer service
 *   - 49535343-...  Microchip Transparent UART (common on thermal printers)
 *   - e7810a71-...  Alternate ESC/POS service used by many POS printers
 *
 * We include supported printer services in the pairing dialog and probe each
 * one for a writable characteristic after the device is selected.
 */
export const PRINTER_SERVICE_UUIDS: string[] = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];

/**
 * Paper width in characters. 80mm paper prints 48 characters per line
 * at the standard font.
 */
export const PRINTER_PAPER_WIDTH = 48;

/** Feed extra lines before cutting so the final printed row clears the cutter. */
export const PRINTER_FEED_BEFORE_CUT = 4;

/**
 * Storage key for the previously paired device ID, used to display the
 * connection state across page reloads.
 */
export const PRINTER_DEVICE_STORAGE_KEY = 'dream-makeover.printer.device';
