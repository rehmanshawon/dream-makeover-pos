import { api } from './api-client';
import type {
  AccountingAccount,
  AccountingJournalEntry,
  CreateAccountingVoucherRequest,
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
};
