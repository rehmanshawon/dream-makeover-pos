export class TransactionDetailItemDto {
  id: string;
  itemType: string;
  itemName: string;
  quantity: number;
  unitPriceMinor: number;
  totalPriceMinor: number;
}

export class TransactionDetailCustomerDto {
  id: string;
  fullName: string;
  phoneNumber: string;
  rewardTier: string;
}

export class TransactionDetailDto {
  id: string;
  invoiceId: string;
  createdAt: Date;
  cashier: string;
  customer: TransactionDetailCustomerDto | null;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  cashReceivedMinor: number;
  changeMinor: number;
  items: TransactionDetailItemDto[];
}
