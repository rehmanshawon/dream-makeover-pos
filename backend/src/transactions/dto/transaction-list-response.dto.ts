import { TransactionListItemDto } from './transaction-list-item.dto';

export class TransactionListSummaryDto {
  transactionCount: number;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  averageSaleMinor: number;
}

export class TransactionListPaginationDto {
  total: number;
  limit: number;
  offset: number;
}

export class TransactionListResponseDto {
  range: { from: string | null; to: string | null };
  filters: { cashier: string | null };
  summary: TransactionListSummaryDto;
  pagination: TransactionListPaginationDto;
  transactions: TransactionListItemDto[];
}
