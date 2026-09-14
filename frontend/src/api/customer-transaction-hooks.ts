import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { customersApi } from './customers';
import type { CustomerTransaction } from '../types/customer-transactions';

export const customerTransactionKeys = {
  all: ['customer-transactions'] as const,
  byCustomer: (customerId: string) => [...customerTransactionKeys.all, customerId] as const,
};

export function useCustomerTransactions(
  customerId: string | undefined,
): UseQueryResult<CustomerTransaction[], Error> {
  return useQuery({
    queryKey: customerTransactionKeys.byCustomer(customerId ?? ''),
    queryFn: () => customersApi.transactions(customerId as string),
    enabled: Boolean(customerId),
  });
}
