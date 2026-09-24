import { useState, type JSX } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  usePayPeriod,
  usePayables,
  useClosePayPeriod,
  useRunPayroll,
  useDeletePayments,
} from '../../../api/payroll-hooks';
import { useDeleteSalaryPayment, useSalaryPayments } from '../../../api/salary-payment-hooks';
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
import type { SalaryPayment } from '../../../types/salary-payments';
import './PayPeriodDetailPage.css';
import { Modal } from '@/ui/Modal/Modal';
import { AttendanceEditor } from './AttendanceEditor';
import { PayrollSalaryPaymentModal } from './PayrollSalaryPaymentModal';
import { AdvanceAdjustmentModal } from './AdvanceAdjustmentModal';
import { Icon } from '../../components/Icon';

export function PayPeriodDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const period = usePayPeriod(id);
  const payables = usePayables(id);
  const paymentsQuery = useSalaryPayments(id);
  const closeMutation = useClosePayPeriod();
  const runMutation = useRunPayroll();
  const deletePaymentMutation = useDeleteSalaryPayment();
  const deletePaymentsMutation = useDeletePayments();
  const isOpen = period.data?.status === 'OPEN';

  const [confirmRun, setConfirmRun] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SalaryPayment | null>(null);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [attendanceFor, setAttendanceFor] = useState<PayableEmployee | null>(null);
  const [salaryPaymentFor, setSalaryPaymentFor] = useState<PayableEmployee | null>(null);
  const [advanceAdjustmentFor, setAdvanceAdjustmentFor] = useState<PayableEmployee | null>(null);

  const setConfirmDeleteOne = (payment: SalaryPayment): void => {
    setPendingDelete(payment);
  };

  const handleDeleteOne = async (): Promise<void> => {
    if (!pendingDelete || !isOpen) return;
    setActionError(null);
    try {
      await deletePaymentMutation.mutateAsync({
        id: pendingDelete.id,
        employeeId: pendingDelete.employeeId,
      });
      setPendingDelete(null);
      setSelectedPaymentIds((prev) => {
        const next = new Set(prev);
        next.delete(pendingDelete.id);
        return next;
      });
      void paymentsQuery.refetch();
      void payables.refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Unable to delete payment.');
      setPendingDelete(null);
    }
  };

  const handleDeleteBulk = async (): Promise<void> => {
    if (selectedPaymentIds.size === 0 || !isOpen) return;
    setActionError(null);
    try {
      await deletePaymentsMutation.mutateAsync([...selectedPaymentIds]);
      setConfirmBulkDelete(false);
      setSelectedPaymentIds(new Set());
      void paymentsQuery.refetch();
      void payables.refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Unable to delete payments.');
      setConfirmBulkDelete(false);
    }
  };

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

  const columns: TableColumn<PayableEmployee>[] = [
    { key: 'name', header: 'Employee', render: (e) => e.employeeName },
    { key: 'role', header: 'Role', align: 'center', render: (e) => e.role },
    {
      key: 'attendance',
      header: 'Attendance',
      align: 'center',
      render: (e) => (
        <Button
          size="sm"
          variant="secondary"
          className="button--icon"
          aria-label={`Attendance for ${e.employeeName}`}
          title={`Attendance for ${e.employeeName}`}
          onClick={(ev) => {
            ev.stopPropagation();
            setAttendanceFor(e);
          }}
        >
          <Icon name="calendar-check" size={16} />
        </Button>
      ),
    },
    {
      key: 'payable',
      header: 'Payable',
      align: 'center',
      render: (e) => formatBdt(e.payableMinor),
    },
    {
      key: 'paid',
      header: 'paid',
      align: 'center',
      render: (e) => formatBdt(e.alreadyPaidMinor),
    },
    {
      key: 'remaining',
      header: 'Due',
      align: 'center',
      render: (e) => (
        <span className="pay-period-detail__remaining">{formatBdt(e.remainingMinor)}</span>
      ),
    },
    {
      key: 'advance',
      header: 'Advance',
      align: 'center',
      render: (e) => formatBdt(e.advanceMinor),
    },
    {
      key: 'adjust',
      header: 'Adjust',
      align: 'center',
      render: (e) => (
        <Button
          size="sm"
          variant="secondary"
          className="button--icon"
          aria-label={`Adjust advance for ${e.employeeName}`}
          title={`Adjust advance for ${e.employeeName}`}
          disabled={!isOpen || e.advanceMinor <= 0}
          onClick={(event) => {
            event.stopPropagation();
            setAdvanceAdjustmentFor(e);
          }}
        >
          <Icon name="adjust" size={16} />
        </Button>
      ),
    },
    {
      key: 'pay',
      header: 'Partial Pay',
      align: 'center',
      render: (e) => (
        <Button
          size="sm"
          variant="primary"
          className="button--icon"
          aria-label={`Pay partial salary for ${e.employeeName}`}
          title={`Pay partial salary for ${e.employeeName}`}
          disabled={!isOpen || e.remainingMinor <= 0}
          onClick={(ev) => {
            ev.stopPropagation();
            setSalaryPaymentFor(e);
          }}
        >
          <Icon name="pay" size={16} />
        </Button>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      render: (e) =>
        e.hasExistingPayment ? (
          e.remainingMinor > 0 ? (
            <Badge variant="warning">Partial</Badge>
          ) : (
            <Badge variant="success">Paid</Badge>
          )
        ) : (
          <Badge variant="warning">Pending</Badge>
        ),
    },
  ];

  const employeeNameLookup = new Map(
    (payables.data ?? []).map((employee) => [employee.employeeId, employee.employeeName]),
  );

  const paymentColumns: TableColumn<SalaryPayment>[] = [
    {
      key: 'select',
      header: 'select',
      render: (p) => (
        <input
          type="checkbox"
          checked={selectedPaymentIds.has(p.id)}
          onChange={(e) => {
            setSelectedPaymentIds((prev) => {
              const next = new Set(prev);
              if (e.target.checked) next.add(p.id);
              else next.delete(p.id);
              return next;
            });
          }}
          aria-label={`Select payment for ${p.employeeId}`}
        />
      ),
    },
    {
      key: 'employeeId',
      header: 'Employee',
      align: 'center',
      render: (p) => employeeNameLookup.get(p.employeeId) ?? p.employeeId,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'center',
      render: (p) => formatBdt(p.amountMinor),
    },
    {
      key: 'method',
      header: 'Method',
      align: 'center',
      render: (p) => p.paymentMethod.replace(/_/g, ' '),
    },
    {
      key: 'paidOn',
      header: 'Paid on',
      align: 'center',
      render: (p) => formatDate(p.paidOn),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (p) => (
        <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteOne(p)} disabled={!isOpen}>
          Delete
        </Button>
      ),
    },
  ];

  const pendingCount =
    payables.data?.filter((e) => !e.hasExistingPayment && e.remainingMinor > 0).length ?? 0;

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

      <Card
        title="Recorded payments"
        subtitle={`${paymentsQuery.data?.length ?? 0} payment${(paymentsQuery.data?.length ?? 0) === 1 ? '' : 's'}`}
        actions={
          selectedPaymentIds.size > 0 ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmBulkDelete(true)}
              disabled={!isOpen || deletePaymentsMutation.isPending}
            >
              Delete {selectedPaymentIds.size} selected
            </Button>
          ) : undefined
        }
      >
        {paymentsQuery.isLoading && (
          <div className="pay-period-detail__center">
            <Spinner label="Loading payments" />
          </div>
        )}

        {paymentsQuery.data && paymentsQuery.data.length === 0 && (
          <EmptyState
            title="No payments yet"
            description="Run payroll to create salary payments for this period."
          />
        )}

        {paymentsQuery.data && paymentsQuery.data.length > 0 && (
          <Table columns={paymentColumns} rows={paymentsQuery.data} getRowKey={(p) => p.id} />
        )}
      </Card>

      <PayrollSalaryPaymentModal
        open={salaryPaymentFor !== null}
        periodId={p.id}
        employee={salaryPaymentFor}
        onClose={() => {
          setSalaryPaymentFor(null);
          void payables.refetch();
          void paymentsQuery.refetch();
        }}
      />

      <AdvanceAdjustmentModal
        open={advanceAdjustmentFor !== null}
        periodId={p.id}
        employee={advanceAdjustmentFor}
        onClose={() => {
          setAdvanceAdjustmentFor(null);
          void payables.refetch();
          void paymentsQuery.refetch();
        }}
      />

      {attendanceFor && (
        <Modal
          open
          title={`Attendance — ${attendanceFor.employeeName}`}
          onClose={() => setAttendanceFor(null)}
          size="lg"
        >
          <AttendanceEditor
            employeeId={attendanceFor.employeeId}
            from={p.startDate}
            to={p.endDate}
            disabled={p.status === 'CLOSED'}
            onSaved={() => {
              void payables.refetch();
            }}
            onClose={() => setAttendanceFor(null)}
          />
        </Modal>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete salary payment"
        message={
          pendingDelete
            ? `Delete the payment of ${formatBdt(pendingDelete.amountMinor)} for ${employeeNameLookup.get(pendingDelete.employeeId) ?? pendingDelete.employeeId}? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deletePaymentMutation.isPending}
        onConfirm={handleDeleteOne}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        title="Delete selected payments"
        message={`Delete ${selectedPaymentIds.size} selected payment${selectedPaymentIds.size === 1 ? '' : 's'}? This cannot be undone.`}
        confirmLabel="Delete payments"
        variant="danger"
        loading={deletePaymentsMutation.isPending}
        onConfirm={handleDeleteBulk}
        onCancel={() => setConfirmBulkDelete(false)}
      />

      <ConfirmDialog
        open={confirmRun}
        title="Run payroll"
        message={`This will pay the full salary due for ${pendingCount} employees without a manual salary payment in this period. Employees with partial payments will be skipped. Continue?`}
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
