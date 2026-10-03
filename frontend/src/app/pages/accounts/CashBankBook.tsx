import { useState, type FormEvent, type JSX } from 'react';
import {
  useAccountingAccounts,
  useAccountingJournal,
  useCreateAccountingVoucher,
  useReverseJournalEntry,
} from '../../../api/accounting-hooks';
import { usePayrollTimeTrust } from '../../../api/time-trust-hooks';
import { ApiError } from '../../../api/api-error';
import type {
  AccountingJournalEntry,
  AccountingVoucherType,
  ManualAccountingVoucherType,
  CreateAccountingVoucherRequest,
} from '../../../types/accounting';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { Select } from '../../../ui/Select';
import { Spinner } from '../../../ui/Spinner';
import { Table, type TableColumn } from '../../../ui/Table';
import { Modal } from '../../../ui/Modal';
import { formatBdt, formatDate, formatDateTime } from '../../../utils/format';
import './CashBankBook.css';

function todayLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function amountToMinor(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole = '0', fractional = ''] = value.split('.');
  const amount = Number(whole) * 100 + Number(fractional.padEnd(2, '0'));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

const typeLabels: Record<AccountingVoucherType, string> = {
  OWNER_CONTRIBUTION: 'Owner deposit',
  OWNER_WITHDRAWAL: 'Owner withdrawal',
  CASH_BANK_TRANSFER: 'Cash / bank transfer',
  EXPENSE_PAYMENT: 'Expense payment',
  SALE_RECEIPT: 'POS sale',
  PURCHASE: 'Purchase',
  SUPPLIER_PAYMENT: 'Supplier payment',
  OPENING_BALANCE: 'Opening balance',
  SALARY_PAYMENT: 'Payroll payment',
  INVENTORY_ADJUSTMENT: 'Inventory adjustment',
  SALES_RETURN: 'Sales return',
  SUPPLIER_RETURN: 'Supplier return',
  INVENTORY_REVALUATION: 'Inventory revaluation',
  JOURNAL_REVERSAL: 'Journal reversal',
};

const manualTypeLabels: Record<ManualAccountingVoucherType, string> = {
  OWNER_CONTRIBUTION: 'Owner deposit',
  OWNER_WITHDRAWAL: 'Owner withdrawal',
  CASH_BANK_TRANSFER: 'Cash / bank transfer',
};

export function CashBankBook(): JSX.Element {
  const today = todayLocal();
  const [entryType, setEntryType] = useState<ManualAccountingVoucherType>('OWNER_CONTRIBUTION');
  const [entryDate, setEntryDate] = useState(today);
  const [amount, setAmount] = useState('');
  const [cashBankAccountCode, setCashBankAccountCode] = useState<'CASH' | 'BANK'>('BANK');
  const [fromAccountCode, setFromAccountCode] = useState<'CASH' | 'BANK'>('CASH');
  const [toAccountCode, setToAccountCode] = useState<'CASH' | 'BANK'>('BANK');
  const [memo, setMemo] = useState('');
  const [reference, setReference] = useState('');
  const [from, setFrom] = useState(today.slice(0, 8) + '01');
  const [to, setTo] = useState(today);
  const [formError, setFormError] = useState<string | null>(null);
  const [entryToReverse, setEntryToReverse] = useState<AccountingJournalEntry | null>(null);
  const [reversalDate, setReversalDate] = useState(today);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalError, setReversalError] = useState<string | null>(null);

  const accounts = useAccountingAccounts();
  const journal = useAccountingJournal(from, to);
  const createVoucher = useCreateAccountingVoucher();
  const reverseEntry = useReverseJournalEntry();
  const timeTrust = usePayrollTimeTrust();

  const columns: TableColumn<AccountingJournalEntry>[] = [
    { key: 'date', header: 'Date', render: (entry) => formatDate(entry.entryDate) },
    { key: 'type', header: 'Voucher', align: 'center', render: (entry) => typeLabels[entry.entryType] },
    {
      key: 'debit',
      header: 'Debit account',
      align: 'center',
      render: (entry) => entry.lines.find((line) => line.debitMinor > 0)?.account.name ?? '—',
    },
    {
      key: 'credit',
      header: 'Credit account',
      align: 'center',
      render: (entry) => entry.lines.find((line) => line.creditMinor > 0)?.account.name ?? '—',
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'center',
      render: (entry) => formatBdt(entry.lines.reduce((sum, line) => sum + line.debitMinor, 0)),
    },
    { key: 'memo', header: 'Description', align: 'center',render: (entry) => entry.memo },
    {
      key: 'recorded',
      header: 'Recorded',
      align: 'center',
      render: (entry) => `${entry.createdBy} · ${formatDateTime(entry.createdAt)}`,
    },
    {
      key: 'correction',
      header: 'Actions',
      align: 'right',
      render: (entry) => {
        const alreadyReversed = (journal.data ?? []).some(
          (candidate) => candidate.sourceReversalEntryId === entry.id,
        );
        if (entry.entryType === 'JOURNAL_REVERSAL' || alreadyReversed) return '—';
        return (
         <Button
            size="sm"
            variant="danger"
            aria-label={`Reverse journal entry dated ${formatDate(entry.entryDate)}`}
            title="Create a reversing entry"
            onClick={() => {
              setEntryToReverse(entry);
              setReversalDate(today);
              setReversalReason('');
              setReversalError(null);
            }}
          >
            Reverse
          </Button>
        );
      },
    },
  ];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError(null);
    const amountMinor = amountToMinor(amount);
    if (amountMinor === null) {
      setFormError('Enter an amount greater than zero with up to two decimal places.');
      return;
    }
    if (entryType === 'CASH_BANK_TRANSFER' && fromAccountCode === toAccountCode) {
      setFormError('Choose different source and destination accounts.');
      return;
    }

    const payload: CreateAccountingVoucherRequest = {
      entryType,
      entryDate,
      amountMinor,
      ...(memo.trim() ? { memo: memo.trim() } : {}),
      ...(reference.trim() ? { reference: reference.trim() } : {}),
      ...(entryType === 'CASH_BANK_TRANSFER'
        ? { fromAccountCode, toAccountCode }
        : { cashBankAccountCode }),
    };
    try {
      await createVoucher.mutateAsync(payload);
      setAmount('');
      setMemo('');
      setReference('');
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Unable to post this voucher.');
    }
  };

  return (
    <Card
      title="Cash & bank book"
      subtitle="Record owner funds and transfers between business cash and bank."
    >
      <p className="cash-bank-book__scope" role="note">
        Sales, purchase, expense, payroll, and supplier-return activity posts here when paid through
        the bank. Stock adjustments and cost revaluations affect inventory accounts, not the bank
        balance.
      </p>

      {accounts.isLoading ? (
        <div className="accounts-page__center">
          <Spinner label="Loading account balances" />
        </div>
      ) : accounts.error ? (
        <div className="accounts-page__error" role="alert">
          Unable to load accounting accounts.
        </div>
      ) : (
        <div className="cash-bank-book__balances" aria-label="Accounting ledger balances">
          {(accounts.data ?? []).map((account) => (
            <div className="cash-bank-book__balance" key={account.code}>
              <span>{account.name}</span>
              <strong>{formatBdt(account.balanceMinor)}</strong>
            </div>
          ))}
        </div>
      )}
      <form className="cash-bank-book__form" onSubmit={(event) => void handleSubmit(event)}>
        <Select
          label="Voucher type"
          value={entryType}
          onChange={(event) => setEntryType(event.target.value as ManualAccountingVoucherType)}
          options={Object.entries(manualTypeLabels).map(([value, label]) => ({ value, label }))}
        />
        <Input
          label="Date"
          type="date"
          value={entryDate}
          onChange={(event) => setEntryDate(event.target.value)}
          required
        />
        <Input
          label="Amount (BDT)"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.00"
          required
        />
        {entryType === 'CASH_BANK_TRANSFER' ? (
          <>
            <Select
              label="Transfer from"
              value={fromAccountCode}
              onChange={(event) => setFromAccountCode(event.target.value as 'CASH' | 'BANK')}
              options={[
                { value: 'CASH', label: 'Cash on hand' },
                { value: 'BANK', label: 'Business bank' },
              ]}
            />
            <Select
              label="Transfer to"
              value={toAccountCode}
              onChange={(event) => setToAccountCode(event.target.value as 'CASH' | 'BANK')}
              options={[
                { value: 'CASH', label: 'Cash on hand' },
                { value: 'BANK', label: 'Business bank' },
              ]}
            />
          </>
        ) : (
          <Select
            label={entryType === 'OWNER_CONTRIBUTION' ? 'Deposit into' : 'Withdraw from'}
            value={cashBankAccountCode}
            onChange={(event) => setCashBankAccountCode(event.target.value as 'CASH' | 'BANK')}
            options={[
              { value: 'CASH', label: 'Cash on hand' },
              { value: 'BANK', label: 'Business bank' },
            ]}
          />
        )}
        <Input
          label="Description"
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          maxLength={255}
        />
        <Input
          label="Reference (optional)"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          maxLength={100}
        />
        <Button
          type="submit"
          loading={createVoucher.isPending}
          disabled={!timeTrust.data?.payrollAllowed}
        >
          Post voucher
        </Button>
        {!timeTrust.data?.payrollAllowed && (
          <p className="cash-bank-book__blocked" role="status">
            Voucher posting is paused until trusted time is available.
          </p>
        )}
        {formError && (
          <p className="cash-bank-book__error" role="alert">
            {formError}
          </p>
        )}
      </form>

      <div className="cash-bank-book__history-header">
        <h4>Journal entries</h4>
        <div className="cash-bank-book__date-filter">
          <Input
            label="From"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <Input
            label="To"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </div>
      {journal.isLoading ? (
        <div className="accounts-page__center">
          <Spinner label="Loading journal entries" />
        </div>
      ) : journal.error ? (
        <div className="accounts-page__error" role="alert">
          Unable to load journal entries.
        </div>
      ) : (
        <Table
          columns={columns}
          rows={journal.data ?? []}
          getRowKey={(entry) => entry.id}
          emptyMessage="No vouchers recorded for this date range."
        />
      )}
      <Modal
        open={entryToReverse !== null}
        title="Reverse journal entry"
        onClose={() => setEntryToReverse(null)}
        size="sm"
      >
        <div className="cash-bank-book__reverse-form">
          <p>
            {entryToReverse
              ? `Create an opposite accounting entry for ${formatDate(entryToReverse.entryDate)}. This does not cancel the linked sale, purchase, expense, or stock movement.`
              : ''}
          </p>
          <Input
            label="Reversal date"
            type="date"
            value={reversalDate}
            onChange={(event) => setReversalDate(event.target.value)}
            required
          />
          <Input
            label="Reason"
            value={reversalReason}
            onChange={(event) => setReversalReason(event.target.value)}
            maxLength={255}
            required
          />
          {reversalError && (
            <p className="cash-bank-book__error" role="alert">
              {reversalError}
            </p>
          )}
          <Button
            variant="danger"
            loading={reverseEntry.isPending}
            onClick={() => {
              if (!entryToReverse || reversalReason.trim().length < 3) {
                setReversalError('Enter a reason of at least 3 characters.');
                return;
              }
              void reverseEntry
                .mutateAsync({
                  id: entryToReverse.id,
                  payload: { reversalDate, reason: reversalReason.trim() },
                })
                .then(() => setEntryToReverse(null))
                .catch((error: unknown) => {
                  setReversalError(
                    error instanceof ApiError ? error.message : 'Unable to reverse entry.',
                  );
                });
            }}
          >
            Create reversal
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
