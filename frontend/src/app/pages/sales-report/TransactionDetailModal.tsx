import type { JSX } from 'react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import { Spinner } from '../../../ui/Spinner';
import { Table, type TableColumn } from '../../../ui/Table';
import { Badge } from '../../../ui/Badge';
import { useTransaction } from '../../../api/transaction-hooks';
import { ApiError } from '../../../api/api-error';
import { formatBdt, formatDateTime } from '../../../utils/format';
import type { TransactionDetailItem } from '../../../types/transactions';
import './TransactionDetailModal.css';

interface TransactionDetailModalProps {
  transactionId: string | null;
  onClose: () => void;
}

export function TransactionDetailModal({
  transactionId,
  onClose,
}: TransactionDetailModalProps): JSX.Element {
  const open = transactionId !== null;
  const { data, isLoading, error } = useTransaction(transactionId ?? undefined);

  const columns: TableColumn<TransactionDetailItem>[] = [
    {
      key: 'itemName',
      header: 'Item',
      render: (item) => item.itemName,
    },
    {
      key: 'itemType',
      header: 'Type',
      render: (item) => <Badge variant="neutral">{item.itemType.toLowerCase()}</Badge>,
    },
    {
      key: 'quantity',
      header: 'Qty',
      align: 'right',
      render: (item) => item.quantity,
    },
    {
      key: 'unitPrice',
      header: 'Unit price',
      align: 'right',
      render: (item) => formatBdt(item.unitPriceMinor),
    },
    {
      key: 'totalPrice',
      header: 'Total',
      align: 'right',
      render: (item) => formatBdt(item.totalPriceMinor),
    },
  ];

  return (
    <Modal open={open} title="Transaction detail" onClose={onClose} size="lg">
      {isLoading && (
        <div className="txn-detail__center">
          <Spinner label="Loading transaction" />
        </div>
      )}

      {error && (
        <div className="txn-detail__error" role="alert">
          {error instanceof ApiError ? error.message : 'Unable to load transaction.'}
        </div>
      )}

      {!isLoading && !error && data && (
        <div className="txn-detail">
          <dl className="txn-detail__facts">
            <div className="txn-detail__fact">
              <dt>Invoice</dt>
              <dd className="txn-detail__invoice">{data.invoiceId}</dd>
            </div>
            <div className="txn-detail__fact">
              <dt>Date</dt>
              <dd>{formatDateTime(data.createdAt)}</dd>
            </div>
            <div className="txn-detail__fact">
              <dt>Cashier</dt>
              <dd>{data.cashier}</dd>
            </div>
            <div className="txn-detail__fact">
              <dt>Customer</dt>
              <dd>{data.customer ? data.customer.fullName : 'Guest'}</dd>
            </div>
          </dl>

          <Table
            columns={columns}
            rows={data.items}
            getRowKey={(item) => item.id}
            emptyMessage="No items on this transaction."
          />

          <dl className="txn-detail__totals">
            <div className="txn-detail__total-row">
              <dt>Subtotal</dt>
              <dd>{formatBdt(data.subtotalMinor)}</dd>
            </div>
            {data.discountMinor > 0 && (
              <div className="txn-detail__total-row">
                <dt>Discount</dt>
                <dd>-{formatBdt(data.discountMinor)}</dd>
              </div>
            )}
            <div className="txn-detail__total-row txn-detail__total-row--grand">
              <dt>Total</dt>
              <dd>{formatBdt(data.totalMinor)}</dd>
            </div>
            <div className="txn-detail__total-row">
              <dt>Cash received</dt>
              <dd>{formatBdt(data.cashReceivedMinor)}</dd>
            </div>
            <div className="txn-detail__total-row">
              <dt>Change</dt>
              <dd>{formatBdt(data.changeMinor)}</dd>
            </div>
          </dl>

          <div className="txn-detail__actions">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
