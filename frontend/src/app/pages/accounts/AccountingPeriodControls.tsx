import { useState, type JSX } from 'react';
import { useAccountingPeriods, useCloseAccountingPeriod } from '../../../api/accounting-hooks';
import { ApiError } from '../../../api/api-error';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { formatDateTime } from '../../../utils/format';

function currentMonth(): string {
  const today = new Date();
  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  return `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;
}

export function AccountingPeriodControls(): JSX.Element {
  const [period, setPeriod] = useState(currentMonth);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const periods = useAccountingPeriods();
  const closeMutation = useCloseAccountingPeriod();

  const close = async (): Promise<void> => {
    setMessage(null);
    try {
      const result = await closeMutation.mutateAsync(period);
      setMessage(`Closed ${result.periodKey}. New postings and edits in that month are blocked.`);
      setConfirmClose(false);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Unable to close this period.');
    }
  };

  return (
    <Card title="Period close" subtitle="Closed months cannot be changed or deleted">
      <div className="accounting-period-controls">
        <Input
          label="Accounting month"
          type="month"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
        />
        <Button
          variant="danger"
          onClick={() => setConfirmClose(true)}
          disabled={!period || closeMutation.isPending}
          loading={closeMutation.isPending}
        >
          Close month
        </Button>
      </div>
      {message && <p role="status">{message}</p>}
      {periods.error && (
        <p role="alert">
          {periods.error instanceof ApiError
            ? periods.error.message
            : 'Unable to load closed months.'}
        </p>
      )}
      {periods.data && periods.data.length > 0 && (
        <ul className="accounting-period-controls__list" aria-label="Closed accounting periods">
          {periods.data.map((closed) => (
            <li key={closed.periodKey}>
              <strong>{closed.periodKey}</strong>
              <span>Closed by {closed.closedBy ?? '—'}</span>
              <span>{closed.closedAt ? formatDateTime(closed.closedAt) : '—'}</span>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={confirmClose}
        title="Close accounting month"
        message={`Close ${period}? This is permanent. Journal activity in that month will become read-only.`}
        confirmLabel="Close month"
        variant="danger"
        loading={closeMutation.isPending}
        onConfirm={() => void close()}
        onCancel={() => setConfirmClose(false)}
      />
    </Card>
  );
}
