export class CustomerTransactionItemDto {
  itemType: string;
  itemName: string;
  quantity: number;
  unitPriceMinor: number;
  totalPriceMinor: number;
}

export class CustomerTransactionDto {
  id: string;
  invoiceId: string;
  createdAt: Date;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  cashier: string;
  items: CustomerTransactionItemDto[];
}
