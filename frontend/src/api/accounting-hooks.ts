import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountingApi } from './accounting';
import type {
  CreateAccountingVoucherRequest,
  CreateBankReconciliationRequest,
  BalanceSheetReport,
  TrialBalanceReport,
} from '../types/accounting';

export const accountingKeys = {
  all: ['accounting'] as const,
  accounts: () => [...accountingKeys.all, 'accounts'] as const,
  journal: (from: string, to: string) => [...accountingKeys.all, 'journal', from, to] as const,
  reconciliation: (statementDate: string) =>
    [...accountingKeys.all, 'reconciliation', statementDate] as const,
  trialBalance: (asOf: string) => [...accountingKeys.all, 'trial-balance', asOf] as const,
  balanceSheet: (asOf: string) => [...accountingKeys.all, 'balance-sheet', asOf] as const,
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

export function useBankReconciliation(statementDate: string) {
  return useQuery({
    queryKey: accountingKeys.reconciliation(statementDate),
    queryFn: () => accountingApi.getBankReconciliation(statementDate),
    enabled: Boolean(statementDate),
  });
}

export function useCreateBankReconciliation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBankReconciliationRequest) =>
      accountingApi.createBankReconciliation(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountingKeys.all });
    },
  });
}

export function useTrialBalance(asOf: string) {
  return useQuery<TrialBalanceReport>({
    queryKey: accountingKeys.trialBalance(asOf),
    queryFn: () => accountingApi.getTrialBalance(asOf),
    enabled: Boolean(asOf),
  });
}

export function useBalanceSheet(asOf: string) {
  return useQuery<BalanceSheetReport>({
    queryKey: accountingKeys.balanceSheet(asOf),
    queryFn: () => accountingApi.getBalanceSheet(asOf),
    enabled: Boolean(asOf),
  });
}
