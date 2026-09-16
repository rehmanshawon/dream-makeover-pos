import { api } from './api-client';
import type {
  TransactionListResponse,
  TransactionDetail,
  TransactionsQuery,
} from '../types/transactions';

function buildQueryString(query: TransactionsQuery): string {
  const params = new URLSearchParams();
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.cashier) params.set('cashier', query.cashier);
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.offset !== undefined) params.set('offset', String(query.offset));
  const s = params.toString();
  return s ? `?${s}` : '';
}

export const transactionsApi = {
  list(query: TransactionsQuery = {}): Promise<TransactionListResponse> {
    return api.get<TransactionListResponse>(`/transactions${buildQueryString(query)}`);
  },

  getById(id: string): Promise<TransactionDetail> {
    return api.get<TransactionDetail>(`/transactions/${id}`);
  },
};
