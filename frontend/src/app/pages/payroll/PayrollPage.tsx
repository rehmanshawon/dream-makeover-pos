import { useState, type JSX } from 'react';
import { Link } from 'react-router-dom';
import { usePayPeriods } from '../../../api/payroll-hooks';
import { ApiError } from '../../../api/api-error';
import { Badge } from '../../../ui/Badge';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { Spinner } from '../../../ui/Spinner';
import { Table, type TableColumn } from '../../../ui/Table';
import { formatDate } from '../../../utils/format';
import type { PayPeriod } from '../../../types/payroll';
import { PayPeriodFormModal } from './PayPeriodFormModal';
import './PayrollPage.css';

export function PayrollPage(): JSX.Element {
  const { data, isLoading, error } = usePayPeriods();
  const [createOpen, setCreateOpen] = useState(false);

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
        <Link
          to={`/payroll/${p.id}`}
          className="payroll__view-link"
          onClick={(e) => e.stopPropagation()}
        >
          View
        </Link>
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
    </div>
  );
}
