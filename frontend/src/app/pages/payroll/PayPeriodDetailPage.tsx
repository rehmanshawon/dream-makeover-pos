import { useState, type JSX } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  usePayPeriod,
  usePayables,
  useClosePayPeriod,
  useRunPayroll,
} from '../../../api/payroll-hooks';
import { ApiError } from '../../../api/api-error';
import { Badge } from '../../../ui/Badge';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { EmptyState } from '../../../ui/EmptyState';
import { Spinner } from '../../../ui/Spinner';
import { Table, type TableColumn } from '../../../ui/Table';
import { formatBdt, formatDate, formatDateTime } from '../../../utils/format';
import type { PayableEmployee } from '../../../types/payroll';
import './PayPeriodDetailPage.css';

export function PayPeriodDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const period = usePayPeriod(id);
  const payables = usePayables(id);
  const closeMutation = useClosePayPeriod();
  const runMutation = useRunPayroll();

  const [confirmRun, setConfirmRun] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleRun = async (): Promise<void> => {
    if (!id) return;
    setActionError(null);
    try {
      await runMutation.mutateAsync(id);
      setConfirmRun(false);
      void payables.refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Unable to run payroll.');
      setConfirmRun(false);
    }
  };

  const handleClose = async (): Promise<void> => {
    if (!id) return;
    setActionError(null);
    try {
      await closeMutation.mutateAsync(id);
      setConfirmClose(false);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Unable to close period.');
      setConfirmClose(false);
    }
  };

  if (period.isLoading) {
    return (
      <div className="pay-period-detail__center">
        <Spinner label="Loading pay period" />
      </div>
    );
  }

  if (period.error) {
    const notFound = period.error instanceof ApiError && period.error.status === 404;
    return (
      <div className="pay-period-detail">
        <EmptyState
          title={notFound ? 'Pay period not found' : 'Unable to load pay period'}
          action={<Link to="/payroll">Back to payroll</Link>}
        />
      </div>
    );
  }

  if (!period.data) return <></>;

  const p = period.data;
  const isOpen = p.status === 'OPEN';

  const columns: TableColumn<PayableEmployee>[] = [
    { key: 'name', header: 'Employee', render: (e) => e.employeeName },
    { key: 'role', header: 'Role', render: (e) => e.role },
    {
      key: 'payable',
      header: 'Payable',
      align: 'right',
      render: (e) => formatBdt(e.payableMinor),
    },
    {
      key: 'paid',
      header: 'Already paid',
      align: 'right',
      render: (e) => formatBdt(e.alreadyPaidMinor),
    },
    {
      key: 'remaining',
      header: 'Remaining',
      align: 'right',
      render: (e) => (
        <span className="pay-period-detail__remaining">{formatBdt(e.remainingMinor)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (e) =>
        e.hasExistingPayment ? (
          <Badge variant="success">Paid</Badge>
        ) : (
          <Badge variant="warning">Pending</Badge>
        ),
    },
  ];

  const pendingCount = payables.data?.filter((e) => !e.hasExistingPayment).length ?? 0;

  return (
    <div className="pay-period-detail">
      <div className="pay-period-detail__breadcrumb">
        <Link to="/payroll">Payroll</Link>
        <span aria-hidden="true"> / </span>
        <span>{p.name}</span>
      </div>

      <Card
        title={p.name}
        subtitle={`${formatDate(p.startDate)} – ${formatDate(p.endDate)}`}
        actions={
          <div className="pay-period-detail__actions">
            <Badge variant={isOpen ? 'success' : 'neutral'}>{p.status}</Badge>
            {isOpen && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setConfirmRun(true)}
                  disabled={pendingCount === 0 || runMutation.isPending}
                >
                  Run payroll ({pendingCount})
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setConfirmClose(true)}
                  disabled={closeMutation.isPending}
                >
                  Close period
                </Button>
              </>
            )}
          </div>
        }
      >
        {p.status === 'CLOSED' && p.closedAt && (
          <p className="pay-period-detail__closed-info">
            Closed on {formatDateTime(p.closedAt)} by {p.closedBy}.
          </p>
        )}

        {actionError && (
          <div className="pay-period-detail__error" role="alert">
            {actionError}
          </div>
        )}

        {payables.isLoading && (
          <div className="pay-period-detail__center">
            <Spinner label="Loading payables" />
          </div>
        )}

        {payables.error && (
          <div className="pay-period-detail__error" role="alert">
            {payables.error instanceof ApiError
              ? payables.error.message
              : 'Unable to load payables.'}
          </div>
        )}

        {!payables.isLoading && !payables.error && payables.data && payables.data.length === 0 && (
          <EmptyState
            title="No employees in this period"
            description="Employees who joined on or before this period will appear here."
          />
        )}

        {!payables.isLoading && !payables.error && payables.data && payables.data.length > 0 && (
          <Table columns={columns} rows={payables.data} getRowKey={(e) => e.employeeId} />
        )}
      </Card>

      <ConfirmDialog
        open={confirmRun}
        title="Run payroll"
        message={`This will create salary payments for ${pendingCount} employees who have not yet been paid for this period. Continue?`}
        confirmLabel="Run payroll"
        loading={runMutation.isPending}
        onConfirm={handleRun}
        onCancel={() => setConfirmRun(false)}
      />

      <ConfirmDialog
        open={confirmClose}
        title="Close pay period"
        message="Closing this period will prevent further payments. This action cannot be undone."
        confirmLabel="Close period"
        variant="danger"
        loading={closeMutation.isPending}
        onConfirm={handleClose}
        onCancel={() => setConfirmClose(false)}
      />
    </div>
  );
}
