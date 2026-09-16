import { useMemo, useState, type JSX } from 'react';
import { useTransactions } from '../../../api/transaction-hooks';
import { ApiError } from '../../../api/api-error';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { Spinner } from '../../../ui/Spinner';
import { Table, type TableColumn } from '../../../ui/Table';
import { KpiCard } from '../dashboard/KpiCard';
import { formatBdt, formatDateTime } from '../../../utils/format';
import type { TransactionListItem } from '../../../types/transactions';
import { DateRangeFilter, resolvePreset, type RangePreset } from '../../components/DateRangeFilter';
import { TransactionDetailModal } from './TransactionDetailModal';
import './SalesReportPage.css';

const PAGE_SIZE = 50;

interface FilterState {
  preset: RangePreset;
  range: { from: string; to: string };
  offset: number;
}

function initialFilter(): FilterState {
  return {
    preset: 'this_month',
    range: resolvePreset('this_month'),
    offset: 0,
  };
}

export function SalesReportPage(): JSX.Element {
  const [filter, setFilter] = useState<FilterState>(initialFilter);
  const [detailId, setDetailId] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      from: filter.range.from,
      to: filter.range.to,
      limit: PAGE_SIZE,
      offset: filter.offset,
    }),
    [filter.range.from, filter.range.to, filter.offset],
  );

  const { data, isLoading, error } = useTransactions(query);

  const handleRangeChange = (next: {
    preset: RangePreset;
    range: { from: string; to: string };
  }): void => {
    setFilter({
      preset: next.preset,
      range: next.range,
      offset: 0,
    });
  };

  const columns: TableColumn<TransactionListItem>[] = [
    {
      key: 'invoice',
      header: 'Invoice',
      render: (t) => <span className="sales-report__invoice">{t.invoiceId}</span>,
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (t) => formatDateTime(t.createdAt),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (t) => t.customerName ?? 'Guest',
    },
    {
      key: 'cashier',
      header: 'Cashier',
      render: (t) => t.cashier,
    },
    {
      key: 'items',
      header: 'Items',
      align: 'right',
      render: (t) => t.itemQuantityTotal,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (t) => <span className="sales-report__total">{formatBdt(t.totalMinor)}</span>,
    },
  ];

  const summary = data?.summary;
  const pagination = data?.pagination;
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.limit)) : 1;
  const currentPage = pagination ? Math.floor(pagination.offset / pagination.limit) + 1 : 1;

  const canPrev = filter.offset > 0;
  const canNext =
    pagination !== undefined && filter.offset + (pagination.limit ?? PAGE_SIZE) < pagination.total;

  return (
    <div className="sales-report">
      <Card title="Sales report" subtitle="Transaction history and summary">
        <div className="sales-report__filters">
          <DateRangeFilter
            value={{ preset: filter.preset, range: filter.range }}
            onChange={handleRangeChange}
          />
        </div>
      </Card>

      <section className="sales-report__summary" aria-label="Summary">
        <KpiCard
          label="Transactions"
          value={(summary?.transactionCount ?? 0).toLocaleString('en-BD')}
          loading={isLoading}
        />
        <KpiCard
          label="Total Sales"
          value={formatBdt(summary?.totalMinor ?? 0)}
          loading={isLoading}
        />
        <KpiCard
          label="Discounts"
          value={formatBdt(summary?.discountMinor ?? 0)}
          tone="warning"
          loading={isLoading}
        />
        <KpiCard
          label="Average Sale"
          value={formatBdt(summary?.averageSaleMinor ?? 0)}
          loading={isLoading}
        />
      </section>

      <Card title="Transactions" subtitle={`${filter.range.from} to ${filter.range.to}`}>
        {isLoading && (
          <div className="sales-report__center">
            <Spinner label="Loading transactions" />
          </div>
        )}

        {error && (
          <div className="sales-report__error" role="alert">
            {error instanceof ApiError ? error.message : 'Unable to load transactions.'}
          </div>
        )}

        {!isLoading && !error && data && data.transactions.length === 0 && (
          <EmptyState
            title="No sales in this range"
            description="Adjust the date range to see transactions."
          />
        )}

        {!isLoading && !error && data && data.transactions.length > 0 && (
          <>
            <Table
              columns={columns}
              rows={data.transactions}
              getRowKey={(t) => t.id}
              onRowClick={(t) => setDetailId(t.id)}
            />

            <div className="sales-report__pagination">
              <span className="sales-report__pagination-info">
                Page {currentPage} of {totalPages} · {pagination?.total ?? 0} total
              </span>
              <div className="sales-report__pagination-actions">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!canPrev}
                  onClick={() =>
                    setFilter((f) => ({
                      ...f,
                      offset: Math.max(0, f.offset - PAGE_SIZE),
                    }))
                  }
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!canNext}
                  onClick={() =>
                    setFilter((f) => ({
                      ...f,
                      offset: f.offset + PAGE_SIZE,
                    }))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <TransactionDetailModal transactionId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
