export type AccountingAccountType = 'ASSET' | 'EQUITY' | 'CONTRA_EQUITY' | 'LIABILITY' | 'EXPENSE';

export type AccountingVoucherType =
  'OWNER_CONTRIBUTION' | 'OWNER_WITHDRAWAL' | 'CASH_BANK_TRANSFER' | 'EXPENSE_PAYMENT';

export type ManualAccountingVoucherType = Exclude<AccountingVoucherType, 'EXPENSE_PAYMENT'>;

export interface AccountingAccount {
  id: string;
  code: string;
  name: string;
  type: AccountingAccountType;
  balanceMinor: number;
}

export interface AccountingJournalLine {
  id: string;
  debitMinor: number;
  creditMinor: number;
  account: { id: string; code: string; name: string };
}

export interface AccountingJournalEntry {
  id: string;
  entryType: AccountingVoucherType;
  entryDate: string;
  memo: string;
  reference: string | null;
  createdBy: string;
  createdAt: string;
  lines: AccountingJournalLine[];
}

export interface CreateAccountingVoucherRequest {
  entryType: ManualAccountingVoucherType;
  entryDate: string;
  amountMinor: number;
  memo?: string;
  reference?: string;
  cashBankAccountCode?: 'CASH' | 'BANK';
  fromAccountCode?: 'CASH' | 'BANK';
  toAccountCode?: 'CASH' | 'BANK';
}
