import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountingApi } from './accounting';
import type { CreateAccountingVoucherRequest } from '../types/accounting';

export const accountingKeys = {
  all: ['accounting'] as const,
  accounts: () => [...accountingKeys.all, 'accounts'] as const,
  journal: (from: string, to: string) => [...accountingKeys.all, 'journal', from, to] as const,
};

export function useAccountingAccounts() {
  return useQuery({
    queryKey: accountingKeys.accounts(),
    queryFn: () => accountingApi.getAccounts(),
  });
}

export function useAccountingJournal(from: string, to: string) {
  return useQuery({
    queryKey: accountingKeys.journal(from, to),
    queryFn: () => accountingApi.getJournal(from, to),
  });
}

export function useCreateAccountingVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAccountingVoucherRequest) => accountingApi.createVoucher(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountingKeys.all });
    },
  });
}
