import { useMemo, useState, type JSX } from 'react';
import {
  useEmployeeSalaryPayments,
  useDeleteSalaryPayment,
} from '../../../api/salary-payment-hooks';
import { ApiError } from '../../../api/api-error';
import { Badge } from '../../../ui/Badge';
import { Button } from '../../../ui/Button';
import { EmptyState } from '../../../ui/EmptyState';
import { Spinner } from '../../../ui/Spinner';
import { Table, type TableColumn } from '../../../ui/Table';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { Icon } from '../../components/Icon';
import { formatBdt, formatDate } from '../../../utils/format';
import {
  SALARY_PAYMENT_TYPE_LABELS,
  SALARY_PAYMENT_METHOD_LABELS,
  type SalaryPayment,
} from '../../../types/salary-payments';

import { BUSINESS_INFO } from '../../../config/business';
import { formatPayslip } from '../payroll/payslip-formatter';
import { getReceiptPrinter } from '../pos/receipt/printer/printer-provider';

import './SalaryPaymentHistory.css';
import { Employee } from '@/types/employees';

interface SalaryPaymentHistoryProps {
  employee: Employee;
}

const TYPE_VARIANT: Record<
  SalaryPayment['paymentType'],
  'accent' | 'success' | 'warning' | 'neutral'
> = {
  REGULAR: 'accent',
  BONUS: 'success',
  OVERTIME: 'warning',
  ADVANCE: 'neutral',
  ADVANCE_ADJUSTMENT: 'accent',
};

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function SalaryPaymentHistory({ employee }: SalaryPaymentHistoryProps): JSX.Element {
  const { data, isLoading, error } = useEmployeeSalaryPayments(employee.id);
  const deleteMutation = useDeleteSalaryPayment();

  const [pendingDelete, setPendingDelete] = useState<SalaryPayment | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [printingId, setPrintingId] = useState<string | null>(null);

  const handlePrint = async (payment: SalaryPayment): Promise<void> => {
    setPrintingId(payment.id);

    try {
      const frequencyDays =
        employee.salaryFrequency === 'MONTHLY' ? 30 : employee.salaryFrequency === 'WEEKLY' ? 7 : 1;
      const dailyRate = Math.round(payment.amountMinor / frequencyDays); // approximate; see note
      const lines = formatPayslip(
        {
          employeeName: employee.fullName, // we do not have the name here; see note
          employeeRole: employee.role,
          periodName: 'Salary payment',
          periodStart: payment.paidOn,
          periodEnd: payment.paidOn,
          paidOn: payment.paidOn,
          workedDays: frequencyDays,
          dailyRateMinor: dailyRate,
          baseSalaryMinor: employee.salaryMinor,
          amountPaidMinor: payment.amountMinor,
          paymentMethodLabel: SALARY_PAYMENT_METHOD_LABELS[payment.paymentMethod],
          paymentTypeLabel: SALARY_PAYMENT_TYPE_LABELS[payment.paymentType],
          note: payment.note,
          recordedBy: payment.paidBy,
        },
        BUSINESS_INFO,
      );
      const printer = getReceiptPrinter();
      await printer.print(lines);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to print payslip.');
    } finally {
      setPrintingId(null);
    }
  };

  const totals = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        allTimeMinor: 0,
        thisMonthMinor: 0,
        lastPaidOn: null as string | null,
      };
    }
    const monthKey = currentMonthKey();
    let allTime = 0;
    let thisMonth = 0;
    for (const p of data) {
      allTime += p.amountMinor;
      if (p.paidOn.startsWith(monthKey)) {
        thisMonth += p.amountMinor;
      }
    }
    const sorted = [...data].sort((a, b) => b.paidOn.localeCompare(a.paidOn));
    return {
      allTimeMinor: allTime,
      thisMonthMinor: thisMonth,
      lastPaidOn: sorted[0]?.paidOn ?? null,
    };
  }, [data]);

  const handleConfirmDelete = async (): Promise<void> => {
    if (!pendingDelete) return;
    setActionError(null);
    try {
      await deleteMutation.mutateAsync({
        id: pendingDelete.id,
        employeeId: employee.id,
      });
      setPendingDelete(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Unable to delete payment.');
      setPendingDelete(null);
    }
  };

  const columns: TableColumn<SalaryPayment>[] = [
    {
      key: 'paidOn',
      header: 'Date',
      render: (p) => formatDate(p.paidOn),
    },
    {
      key: 'type',
      header: 'Type',
      render: (p) => (
        <Badge variant={TYPE_VARIANT[p.paymentType]}>
          {SALARY_PAYMENT_TYPE_LABELS[p.paymentType]}
        </Badge>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      render: (p) => SALARY_PAYMENT_METHOD_LABELS[p.paymentMethod],
    },
    {
      key: 'note',
      header: 'Note',
      render: (p) => p.note ?? '—',
    },
    {
      key: 'paidBy',
      header: 'Recorded by',
      render: (p) => p.paidBy,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (p) => <span className="payment-history__amount">{formatBdt(p.amountMinor)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (p) => (
        <Button
          size="sm"
          variant="ghost"
          className="button--icon"
          aria-label="Delete"
          title="Delete salary payment"
          onClick={() => setPendingDelete(p)}
          disabled={deleteMutation.isPending}
        >
          <Icon name="trash" size={16} />
        </Button>
      ),
    },
    {
      key: 'print',
      header: '',
      align: 'right',
      render: (p) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handlePrint(p)}
          loading={printingId === p.id}
          disabled={printingId !== null && printingId !== p.id}
        >
          Print
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="payment-history__center">
        <Spinner label="Loading payment history" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-history__error" role="alert">
        {error instanceof ApiError ? error.message : 'Unable to load payment history.'}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No payments recorded yet"
        description="Record the first payment to see it here."
      />
    );
  }

  return (
    <div className="payment-history">
      <dl className="payment-history__summary">
        <div className="payment-history__stat">
          <dt>Total paid</dt>
          <dd>{formatBdt(totals.allTimeMinor)}</dd>
        </div>
        <div className="payment-history__stat">
          <dt>This month</dt>
          <dd>{formatBdt(totals.thisMonthMinor)}</dd>
        </div>
        <div className="payment-history__stat">
          <dt>Last payment</dt>
          <dd>{totals.lastPaidOn ? formatDate(totals.lastPaidOn) : '—'}</dd>
        </div>
      </dl>

      {actionError && (
        <div className="payment-history__error" role="alert">
          {actionError}
        </div>
      )}

      <Table columns={columns} rows={data} getRowKey={(p) => p.id} />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete payment"
        message={
          pendingDelete
            ? `Delete the payment of ${formatBdt(pendingDelete.amountMinor)} on ${formatDate(pendingDelete.paidOn)}? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
