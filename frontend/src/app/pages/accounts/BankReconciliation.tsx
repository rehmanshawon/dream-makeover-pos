import { useEffect, useMemo, useState, type FormEvent, type JSX } from 'react';
import { useBankReconciliation, useCreateBankReconciliation } from '../../../api/accounting-hooks';
import { ApiError } from '../../../api/api-error';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { Spinner } from '../../../ui/Spinner';
import { formatBdt, formatDate } from '../../../utils/format';
import './BankReconciliation.css';

function todayLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function minorInput(value: string): number | null {
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const negative = value.startsWith('-');
  const [whole = '0', fraction = ''] = value.replace('-', '').split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(amount) ? (negative ? -amount : amount) : null;
}

function amountInput(value: number): string {
  return (value / 100).toFixed(2);
}

export function BankReconciliation(): JSX.Element {
  const [statementDate, setStatementDate] = useState(todayLocal());
  const [openingBalance, setOpeningBalance] = useState('0.00');
  const [closingBalance, setClosingBalance] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const reconciliation = useBankReconciliation(statementDate);
  const createReconciliation = useCreateBankReconciliation();

  useEffect(() => {
    if (!reconciliation.data) return;
    setOpeningBalance(amountInput(reconciliation.data.openingBalanceMinor));
    if (reconciliation.data.completedReconciliation) {
      setClosingBalance(
        amountInput(reconciliation.data.completedReconciliation.closingBalanceMinor),
      );
    }
    setSelectedIds(new Set());
    setFormError(null);
  }, [reconciliation.data]);

  const selectedMovementMinor = useMemo(() => {
    const completed = reconciliation.data?.completedReconciliation;
    if (completed) return completed.clearedMovementMinor;
    const candidates = reconciliation.data?.candidates ?? [];
    return candidates.reduce(
      (sum, candidate) =>
        sum + (selectedIds.has(candidate.journalLineId) ? candidate.movementMinor : 0),
      0,
    );
  }, [reconciliation.data?.candidates, selectedIds]);
  const openingMinor = minorInput(openingBalance);
  const closingMinor = minorInput(closingBalance);
  const calculatedClosingMinor =
    openingMinor === null ? null : openingMinor + selectedMovementMinor;
  const differenceMinor =
    calculatedClosingMinor === null || closingMinor === null
      ? null
      : closingMinor - calculatedClosingMinor;

  const toggleLine = (journalLineId: string): void => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(journalLineId)) next.delete(journalLineId);
      else next.add(journalLineId);
      return next;
    });
    setFormError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);
    if (openingMinor === null || closingMinor === null || calculatedClosingMinor === null) {
      setFormError('Enter valid statement balances with up to two decimal places.');
      return;
    }
    if (differenceMinor !== 0) {
      setFormError('The selected transactions must match the statement closing balance.');
      return;
    }
    try {
      await createReconciliation.mutateAsync({
        statementDate,
        openingBalanceMinor: openingMinor,
        closingBalanceMinor: closingMinor,
        clearedJournalLineIds: [...selectedIds],
      });
      setSuccess(`Bank statement through ${formatDate(statementDate)} reconciled.`);
      setClosingBalance('');
      setSelectedIds(new Set());
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'Unable to finalize this reconciliation.',
      );
    }
  };

  return (
    <Card title="Bank reconciliation" subtitle="Match bank statement activity to the BANK ledger.">
      <form className="bank-reconciliation" onSubmit={(event) => void handleSubmit(event)}>
        <div className="bank-reconciliation__balances">
          <Input
            label="Statement date"
            type="date"
            value={statementDate}
            onChange={(event) => {
              setStatementDate(event.target.value);
              setClosingBalance('');
              setSuccess(null);
            }}
            required
          />
          <Input
            label="Opening balance (BDT)"
            inputMode="decimal"
            value={openingBalance}
            onChange={(event) => setOpeningBalance(event.target.value)}
            disabled={
              Boolean(reconciliation.data?.previousStatementDate) ||
              Boolean(reconciliation.data?.completedReconciliation)
            }
            required
          />
          <Input
            label="Statement closing balance (BDT)"
            inputMode="decimal"
            value={closingBalance}
            onChange={(event) => setClosingBalance(event.target.value)}
            placeholder="0.00"
            disabled={Boolean(reconciliation.data?.completedReconciliation)}
            required
          />
        </div>

        {reconciliation.data?.previousStatementDate && (
          <p className="bank-reconciliation__previous">
            Previous statement reconciled through{' '}
            {formatDate(reconciliation.data.previousStatementDate)}.
          </p>
        )}
        {!reconciliation.data?.previousStatementDate &&
          !reconciliation.data?.completedReconciliation &&
          reconciliation.data && (
            <p className="bank-reconciliation__previous">
              Enter the opening balance shown on your first statement in this ledger.
            </p>
          )}
        {reconciliation.data?.completedReconciliation && (
          <p className="bank-reconciliation__success" role="status">
            This statement was reconciled by {reconciliation.data.completedReconciliation.createdBy}
            .
          </p>
        )}

        <div className="bank-reconciliation__summary" aria-live="polite">
          <span>Opening balance</span>
          <strong>{formatBdt(openingMinor ?? 0)}</strong>
          <span>Selected bank activity</span>
          <strong>{formatBdt(selectedMovementMinor)}</strong>
          <span>Calculated statement balance</span>
          <strong>{formatBdt(calculatedClosingMinor ?? 0)}</strong>
          <span>Difference</span>
          <strong className={differenceMinor === 0 ? 'is-balanced' : 'is-unbalanced'}>
            {differenceMinor === null ? 'Enter closing balance' : formatBdt(differenceMinor)}
          </strong>
        </div>

        {reconciliation.isLoading ? (
          <div className="accounts-page__center">
            <Spinner label="Loading bank transactions" />
          </div>
        ) : reconciliation.error ? (
          <p className="bank-reconciliation__error" role="alert">
            {reconciliation.error instanceof ApiError
              ? reconciliation.error.message
              : 'Unable to load unreconciled bank transactions.'}
          </p>
        ) : (
          <div className="bank-reconciliation__list" aria-label="Unreconciled bank transactions">
            {(reconciliation.data?.candidates ?? []).length === 0 ? (
              <p className="bank-reconciliation__empty">
                No unreconciled bank postings through this date.
              </p>
            ) : (
              reconciliation.data?.candidates.map((candidate) => (
                <label className="bank-reconciliation__row" key={candidate.journalLineId}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(candidate.journalLineId)}
                    onChange={() => toggleLine(candidate.journalLineId)}
                  />
                  <span className="bank-reconciliation__date">
                    {formatDate(candidate.entryDate)}
                  </span>
                  <span className="bank-reconciliation__memo">
                    <strong>{candidate.memo}</strong>
                    {candidate.reference && <small>{candidate.reference}</small>}
                  </span>
                  <strong
                    className={candidate.movementMinor >= 0 ? 'is-balanced' : 'is-unbalanced'}
                  >
                    {formatBdt(candidate.movementMinor)}
                  </strong>
                </label>
              ))
            )}
          </div>
        )}

        {formError && (
          <p className="bank-reconciliation__error" role="alert">
            {formError}
          </p>
        )}
        {success && !reconciliation.data?.completedReconciliation && (
          <p className="bank-reconciliation__success" role="status">
            {success}
          </p>
        )}
        <div className="bank-reconciliation__actions">
          <Button
            type="submit"
            loading={createReconciliation.isPending}
            disabled={
              reconciliation.isLoading ||
              Boolean(reconciliation.error) ||
              Boolean(reconciliation.data?.completedReconciliation) ||
              differenceMinor !== 0
            }
          >
            Finalize reconciliation
          </Button>
        </div>
      </form>
    </Card>
  );
}
