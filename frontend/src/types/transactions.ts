export interface TransactionListItem {
  id: string;
  invoiceId: string;
  createdAt: string;
  cashier: string;
  customerId: string | null;
  customerName: string | null;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  itemLineCount: number;
  itemQuantityTotal: number;
}

export interface TransactionListSummary {
  transactionCount: number;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  averageSaleMinor: number;
}

export interface TransactionListPagination {
  total: number;
  limit: number;
  offset: number;
}

export interface TransactionListResponse {
  range: { from: string | null; to: string | null };
  filters: { cashier: string | null };
  summary: TransactionListSummary;
  pagination: TransactionListPagination;
  transactions: TransactionListItem[];
}

export interface TransactionDetailItem {
  id: string;
  itemType: string;
  itemName: string;
  quantity: number;
  unitPriceMinor: number;
  totalPriceMinor: number;
}

export interface TransactionDetailCustomer {
  id: string;
  fullName: string;
  phoneNumber: string;
  rewardTier: string;
}

export interface TransactionDetail {
  id: string;
  invoiceId: string;
  createdAt: string;
  cashier: string;
  customer: TransactionDetailCustomer | null;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  cashReceivedMinor: number;
  changeMinor: number;
  items: TransactionDetailItem[];
}

export interface TransactionsQuery {
  from?: string;
  to?: string;
  cashier?: string;
  limit?: number;
  offset?: number;
}
