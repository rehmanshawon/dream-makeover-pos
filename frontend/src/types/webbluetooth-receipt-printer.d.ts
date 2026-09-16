declare module '@point-of-sale/webbluetooth-receipt-printer' {
  interface BluetoothReceiptPrinterDevice {
    id?: string;
  }

  export default class WebBluetoothReceiptPrinter {
    device?: BluetoothReceiptPrinterDevice;
    connect(): Promise<unknown>;
    print(data: unknown): Promise<unknown>;
  }
}
