import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { customersApi } from './customers';
import type { Customer, CreateCustomerRequest } from '../types/customers';

export const customerKeys = {
  all: ['customers'] as const,
  list: () => [...customerKeys.all, 'list'] as const,
  detail: (id: string) => [...customerKeys.all, 'detail', id] as const,
};

export function useCustomers(): UseQueryResult<Customer[], Error> {
  return useQuery({
    queryKey: customerKeys.list(),
    queryFn: () => customersApi.list(),
  });
}

export function useCustomer(id: string | undefined): UseQueryResult<Customer, Error> {
  return useQuery({
    queryKey: customerKeys.detail(id ?? ''),
    queryFn: () => customersApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateCustomer(): UseMutationResult<Customer, Error, CreateCustomerRequest> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCustomerRequest) => customersApi.create(payload),
    onSuccess: (created) => {
      // The list is now stale. Mark it to refetch on the next mount.
      void queryClient.invalidateQueries({ queryKey: customerKeys.all });
      // Seed the detail cache so navigating to the new customer is instant.
      queryClient.setQueryData(customerKeys.detail(created.id), created);
    },
  });
}
