import type { JSX } from 'react';
import { Table, type TableColumn } from '../../../ui/Table';
import { EmptyState } from '../../../ui/EmptyState';
import { Spinner } from '../../../ui/Spinner';
import { useCustomerTransactions } from '../../../api/customer-transaction-hooks';
import { ApiError } from '../../../api/api-error';
import { formatBdt, formatDateTime } from '../../../utils/format';
import type { CustomerTransaction } from '../../../types/customer-transactions';
import './CustomerHistoryTable.css';

interface CustomerHistoryTableProps {
  customerId: string;
}

export function CustomerHistoryTable({ customerId }: CustomerHistoryTableProps): JSX.Element {
  const { data, isLoading, error } = useCustomerTransactions(customerId);

  if (isLoading) {
    return (
      <div className="customer-history__loading">
        <Spinner label="Loading purchase history" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="customer-history__error" role="alert">
        {error instanceof ApiError ? error.message : 'Unable to load purchase history.'}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No purchases yet"
        description="Transaction history will appear here once the customer makes a purchase."
      />
    );
  }

  const columns: TableColumn<CustomerTransaction>[] = [
    {
      key: 'createdAt',
      header: 'Date',
      render: (t) => formatDateTime(t.createdAt),
    },
    {
      key: 'invoiceId',
      header: 'Invoice',
      render: (t) => <span className="customer-history__invoice">{t.invoiceId}</span>,
    },
    {
      key: 'items',
      header: 'Items',
      render: (t) => t.items.length,
      align: 'right',
    },
    {
      key: 'total',
      header: 'Total',
      render: (t) => formatBdt(t.totalMinor),
      align: 'right',
    },
    {
      key: 'cashier',
      header: 'Cashier',
      render: (t) => t.cashier,
    },
  ];

  return <Table columns={columns} rows={data} getRowKey={(t) => t.id} />;
}
