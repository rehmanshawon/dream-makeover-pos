export type AccountingAccountType =
  'ASSET' | 'EQUITY' | 'CONTRA_EQUITY' | 'LIABILITY' | 'EXPENSE' | 'REVENUE';

export type AccountingVoucherType =
  | 'OWNER_CONTRIBUTION'
  | 'OWNER_WITHDRAWAL'
  | 'CASH_BANK_TRANSFER'
  | 'EXPENSE_PAYMENT'
  | 'SALE_RECEIPT'
  | 'PURCHASE'
  | 'SUPPLIER_PAYMENT'
  | 'OPENING_BALANCE'
  | 'SALARY_PAYMENT'
  | 'INVENTORY_ADJUSTMENT'
  | 'SALES_RETURN'
  | 'SUPPLIER_RETURN'
  | 'INVENTORY_REVALUATION'
  | 'JOURNAL_REVERSAL';

export type ManualAccountingVoucherType =
  'OWNER_CONTRIBUTION' | 'OWNER_WITHDRAWAL' | 'CASH_BANK_TRANSFER';

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
  sourceReversalEntryId?: string | null;
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

export interface BankReconciliationCandidate {
  journalLineId: string;
  entryDate: string;
  memo: string;
  reference: string | null;
  debitMinor: number;
  creditMinor: number;
  movementMinor: number;
}

export interface BankReconciliationDraft {
  openingBalanceMinor: number;
  previousStatementDate: string | null;
  completedReconciliation: BankReconciliationRecord | null;
  candidates: BankReconciliationCandidate[];
}

export interface CreateBankReconciliationRequest {
  statementDate: string;
  openingBalanceMinor: number;
  closingBalanceMinor: number;
  clearedJournalLineIds: string[];
}

export interface BankReconciliationRecord {
  id: string;
  statementDate: string;
  openingBalanceMinor: number;
  closingBalanceMinor: number;
  clearedMovementMinor: number;
  createdBy: string;
}

export interface TrialBalanceLine {
  accountId: string;
  code: string;
  name: string;
  type: AccountingAccountType;
  debitBalanceMinor: number;
  creditBalanceMinor: number;
}

export interface TrialBalanceReport {
  asOf: string;
  lines: TrialBalanceLine[];
  totalDebitsMinor: number;
  totalCreditsMinor: number;
}

export interface BalanceSheetLine {
  code: string;
  name: string;
  balanceMinor: number;
}

export interface BalanceSheetReport {
  asOf: string;
  assets: BalanceSheetLine[];
  liabilities: BalanceSheetLine[];
  equity: BalanceSheetLine[];
  currentEarningsMinor: number;
  totalAssetsMinor: number;
  totalLiabilitiesMinor: number;
  totalEquityMinor: number;
  totalLiabilitiesAndEquityMinor: number;
}

export interface AccountingPeriodRecord {
  periodKey: string;
  closedAt: string | null;
  closedBy: string | null;
}

export interface ReverseJournalEntryRequest {
  reversalDate: string;
  reason: string;
}
