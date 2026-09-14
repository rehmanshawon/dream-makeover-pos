export interface CustomerTransactionItem {
  itemType: string;
  itemName: string;
  quantity: number;
  unitPriceMinor: number;
  totalPriceMinor: number;
}

export interface CustomerTransaction {
  id: string;
  invoiceId: string;
  createdAt: string;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  cashier: string;
  items: CustomerTransactionItem[];
}
