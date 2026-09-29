import { api } from './api-client';
import type {
  AccountingAccount,
  AccountingJournalEntry,
  BalanceSheetReport,
  BankReconciliationDraft,
  BankReconciliationRecord,
  CreateBankReconciliationRequest,
  CreateAccountingVoucherRequest,
  TrialBalanceReport,
} from '../types/accounting';

export const accountingApi = {
  getAccounts(): Promise<AccountingAccount[]> {
    return api.get<AccountingAccount[]>('/accounting/accounts');
  },

  getJournal(from: string, to: string): Promise<AccountingJournalEntry[]> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return api.get<AccountingJournalEntry[]>(`/accounting/journal?${params.toString()}`);
  },

  createVoucher(payload: CreateAccountingVoucherRequest): Promise<AccountingJournalEntry> {
    return api.post<AccountingJournalEntry>('/accounting/vouchers', payload);
  },

  getBankReconciliation(statementDate: string): Promise<BankReconciliationDraft> {
    const params = new URLSearchParams({ statementDate });
    return api.get<BankReconciliationDraft>(`/accounting/reconciliation?${params.toString()}`);
  },

  createBankReconciliation(
    payload: CreateBankReconciliationRequest,
  ): Promise<BankReconciliationRecord> {
    return api.post<BankReconciliationRecord>('/accounting/reconciliation', payload);
  },

  getTrialBalance(asOf: string): Promise<TrialBalanceReport> {
    const params = new URLSearchParams({ asOf });
    return api.get<TrialBalanceReport>(`/accounting/trial-balance?${params.toString()}`);
  },

  getBalanceSheet(asOf: string): Promise<BalanceSheetReport> {
    const params = new URLSearchParams({ asOf });
    return api.get<BalanceSheetReport>(`/accounting/balance-sheet?${params.toString()}`);
  },
};
