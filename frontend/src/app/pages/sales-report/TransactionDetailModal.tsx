import { useState, type FormEvent, type JSX } from 'react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import { Spinner } from '../../../ui/Spinner';
import { Table, type TableColumn } from '../../../ui/Table';
import { Badge } from '../../../ui/Badge';
import { Select } from '../../../ui/Select/Select';
import { useTransaction } from '../../../api/transaction-hooks';
import { useCreateSalesReturn } from '../../../api/sales-return-hooks';
import { ApiError } from '../../../api/api-error';
import { formatBdt, formatDateTime } from '../../../utils/format';
import type { TransactionDetailItem } from '../../../types/transactions';
import { useAuth } from '../../auth/AuthContext';
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
  const { isAdmin } = useAuth();
  const createReturn = useCreateSalesReturn();
  const [returnMode, setReturnMode] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'BANK' | 'MOBILE'>('CASH');
  const [note, setNote] = useState('');

  const returnableItems = data?.items.filter((item) => item.itemType === 'PRODUCT') ?? [];
  const selectedLines = returnableItems.flatMap((item) => {
    const quantity = quantities[item.id] ?? 0;
    return quantity > 0 ? [{ transactionItemId: item.id, quantity }] : [];
  });

  const submitReturn = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!transactionId || selectedLines.length === 0) return;
    const returnDate = new Date();
    const localDate = [returnDate.getFullYear(), returnDate.getMonth() + 1, returnDate.getDate()]
      .map((part) => String(part).padStart(2, '0'))
      .join('-');
    createReturn.mutate({
      transactionId,
      returnDate: localDate,
      refundMethod,
      ...(note.trim() ? { note: note.trim() } : {}),
      lines: selectedLines,
    });
  };

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

          {isAdmin && returnableItems.length > 0 && (
            <section className="txn-detail__return" aria-label="Customer return">
              {!returnMode ? (
                <Button variant="secondary" onClick={() => setReturnMode(true)}>
                  Return products
                </Button>
              ) : (
                <form onSubmit={submitReturn}>
                  <h3>Return products</h3>
                  <p className="txn-detail__return-hint">
                    Enter quantities to refund. The sale history is checked before posting.
                  </p>
                  <div className="txn-detail__return-lines">
                    {returnableItems.map((item) => (
                      <label className="txn-detail__return-line" key={item.id}>
                        <span>
                          {item.itemName} <small>Sold: {item.quantity}</small>
                        </span>
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          step="1"
                          value={quantities[item.id] ?? 0}
                          aria-label={`Quantity to return for ${item.itemName}`}
                          onChange={(event) => {
                            const quantity = Number(event.target.value);
                            setQuantities((current) => ({
                              ...current,
                              [item.id]: Number.isInteger(quantity) && quantity >= 0 ? quantity : 0,
                            }));
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <div className="txn-detail__return-fields">
                    <Select
                      label="Refund method"
                      value={refundMethod}
                      onChange={(event) =>
                        setRefundMethod(event.target.value as 'CASH' | 'BANK' | 'MOBILE')
                      }
                      options={[
                        { value: 'CASH', label: 'Cash' },
                        { value: 'BANK', label: 'Bank' },
                        { value: 'MOBILE', label: 'Mobile wallet' },
                      ]}
                    />
                    <label className="txn-detail__return-note">
                      Note
                      <input
                        maxLength={255}
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                      />
                    </label>
                  </div>
                  {createReturn.isError && (
                    <div className="txn-detail__error" role="alert">
                      {createReturn.error instanceof ApiError
                        ? createReturn.error.message
                        : 'Unable to post this return.'}
                    </div>
                  )}
                  {createReturn.isSuccess && (
                    <p className="txn-detail__return-success" role="status">
                      Return posted. Refund: {formatBdt(createReturn.data.refundMinor)}.
                    </p>
                  )}
                  <div className="txn-detail__return-actions">
                    <Button
                      type="submit"
                      loading={createReturn.isPending}
                      disabled={selectedLines.length === 0 || createReturn.isSuccess}
                    >
                      Post return
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setReturnMode(false);
                        createReturn.reset();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </section>
          )}

          <div className="txn-detail__actions">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
