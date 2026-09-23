import { useState, type JSX } from 'react';
import { Link } from 'react-router-dom';
import { useDeletePayPeriod, usePayPeriods } from '../../../api/payroll-hooks';
import { ApiError } from '../../../api/api-error';
import { Badge } from '../../../ui/Badge';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { EmptyState } from '../../../ui/EmptyState';
import { Spinner } from '../../../ui/Spinner';
import { Table, type TableColumn } from '../../../ui/Table';
import { formatDate } from '../../../utils/format';
import type { PayPeriod } from '../../../types/payroll';
import { PayPeriodFormModal } from './PayPeriodFormModal';
import './PayrollPage.css';

export function PayrollPage(): JSX.Element {
  const { data, isLoading, error } = usePayPeriods();
  const deleteMutation = useDeletePayPeriod();
  const [createOpen, setCreateOpen] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState<PayPeriod | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (): Promise<void> => {
    if (!periodToDelete) return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(periodToDelete.id);
      setPeriodToDelete(null);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Unable to delete pay period.');
      setPeriodToDelete(null);
    }
  };

  const columns: TableColumn<PayPeriod>[] = [
    {
      key: 'name',
      header: 'Period',
      render: (p) => <span className="payroll__name">{p.name}</span>,
    },
    {
      key: 'range',
      header: 'Dates',
      render: (p) => `${formatDate(p.startDate)} – ${formatDate(p.endDate)}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <Badge variant={p.status === 'OPEN' ? 'success' : 'neutral'}>{p.status}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (p) => (
        <div className="payroll__actions">
          <Link
            to={`/payroll/${p.id}`}
            className="payroll__view-link"
            onClick={(e) => e.stopPropagation()}
          >
            View
          </Link>
          <Button
            size="sm"
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteError(null);
              setPeriodToDelete(p);
            }}
            disabled={p.status !== 'OPEN'}
            title={p.status === 'OPEN' ? 'Delete pay period' : 'Closed periods cannot be deleted'}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="payroll">
      <Card
        title="Payroll"
        subtitle="Pay periods and salary runs"
        actions={<Button onClick={() => setCreateOpen(true)}>New pay period</Button>}
      >
        {isLoading && (
          <div className="payroll__center">
            <Spinner label="Loading pay periods" />
          </div>
        )}

        {error && (
          <div className="payroll__error" role="alert">
            {error instanceof ApiError ? error.message : 'Unable to load pay periods.'}
          </div>
        )}

        {deleteError && (
          <div className="payroll__error" role="alert">
            {deleteError}
          </div>
        )}

        {!isLoading && !error && data && data.length === 0 && (
          <EmptyState
            title="No pay periods yet"
            description="Create the first pay period to start running payroll."
            action={<Button onClick={() => setCreateOpen(true)}>Create pay period</Button>}
          />
        )}

        {!isLoading && !error && data && data.length > 0 && (
          <Table columns={columns} rows={data} getRowKey={(p) => p.id} />
        )}
      </Card>

      <PayPeriodFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ConfirmDialog
        open={Boolean(periodToDelete)}
        title="Delete pay period"
        message={
          periodToDelete
            ? `Delete ${periodToDelete.name}? This cannot be undone.`
            : 'Delete this pay period?'
        }
        confirmLabel="Delete period"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setPeriodToDelete(null)}
      />
    </div>
  );
}
