export class TransactionListItemDto {
  id: string;
  invoiceId: string;
  createdAt: Date;
  cashier: string;
  customerId: string | null;
  customerName: string | null;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  itemLineCount: number;
  itemQuantityTotal: number;
}
