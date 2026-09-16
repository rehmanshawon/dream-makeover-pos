import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { transactionsApi } from './transactions';
import type {
  TransactionListResponse,
  TransactionDetail,
  TransactionsQuery,
} from '../types/transactions';

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (query: TransactionsQuery) => [...transactionKeys.all, 'list', query] as const,
  detail: (id: string) => [...transactionKeys.all, 'detail', id] as const,
};

export function useTransactions(
  query: TransactionsQuery,
): UseQueryResult<TransactionListResponse, Error> {
  return useQuery({
    queryKey: transactionKeys.list(query),
    queryFn: () => transactionsApi.list(query),
    placeholderData: keepPreviousData,
  });
}

export function useTransaction(id: string | undefined): UseQueryResult<TransactionDetail, Error> {
  return useQuery({
    queryKey: transactionKeys.detail(id ?? ''),
    queryFn: () => transactionsApi.getById(id as string),
    enabled: Boolean(id),
  });
}
