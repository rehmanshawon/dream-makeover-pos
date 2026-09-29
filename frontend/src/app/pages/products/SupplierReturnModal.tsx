import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { ApiError } from '../../../api/api-error';
import { useCreateSupplierReturn, useReturnablePurchaseLines } from '../../../api/purchase-hooks';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Modal } from '../../../ui/Modal';
import { Select } from '../../../ui/Select';
import { formatBdt } from '../../../utils/format';
import type { PurchasePaymentMethod, ReturnablePurchaseLine } from '../../../types/purchases';
import './inventory-modal.css';

interface SupplierReturnModalProps {
  open: boolean;
  productId: string;
  productName: string;
  onClose: () => void;
}

function localToday(): string {
  const today = new Date();
  return [today.getFullYear(), today.getMonth() + 1, today.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');
}

export function SupplierReturnModal({
  open,
  productId,
  productName,
  onClose,
}: SupplierReturnModalProps): JSX.Element {
  const linesQuery = useReturnablePurchaseLines(productId, open);
  const mutation = useCreateSupplierReturn();
  const [purchaseLineId, setPurchaseLineId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [returnDate, setReturnDate] = useState(localToday());
  const [refundMethod, setRefundMethod] = useState<PurchasePaymentMethod>('CASH');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedLine = linesQuery.data?.find((line) => line.purchaseLineId === purchaseLineId);
  const maxQuantity = selectedLine
    ? Math.min(selectedLine.remainingQuantity, selectedLine.productStock)
    : 0;

  useEffect(() => {
    if (open) {
      setPurchaseLineId('');
      setQuantity('1');
      setReturnDate(localToday());
      setRefundMethod('CASH');
      setNote('');
      setError(null);
      mutation.reset();
    }
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    const amount = Number(quantity);
    if (!selectedLine) {
      setError('Select a purchase line');
      return;
    }
    if (!Number.isInteger(amount) || amount < 1 || amount > maxQuantity) {
      setError(`Quantity must be between 1 and ${maxQuantity}`);
      return;
    }
    try {
      await mutation.mutateAsync({
        purchaseId: selectedLine.purchaseId,
        returnDate,
        refundMethod,
        ...(note.trim() ? { note: note.trim() } : {}),
        lines: [{ purchaseLineId: selectedLine.purchaseLineId, quantity: amount }],
      });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to return stock to supplier');
    }
  };

  const options = (linesQuery.data ?? []).map((line: ReturnablePurchaseLine) => ({
    value: line.purchaseLineId,
    label: `${line.purchaseDate} · ${line.supplierName ?? 'Unknown supplier'} · ${line.remainingQuantity} remaining · ${formatBdt(line.unitCostMinor)}/unit`,
    disabled: line.productStock < 1,
  }));

  return (
    <Modal
      open={open}
      title={`Return to supplier — ${productName}`}
      onClose={onClose}
      size="md"
      closeOnOverlayClick={!mutation.isPending}
    >
      {linesQuery.isLoading && <p>Loading purchase lines…</p>}
      {linesQuery.isError && (
        <div className="inventory-form__error" role="alert">
          Unable to load purchase history.
        </div>
      )}
      {mutation.isSuccess && (
        <div>
          <p role="status">
            Supplier return posted. Credit: {formatBdt(mutation.data.creditMinor)}.
          </p>
          <div className="inventory-form__actions">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      )}
      {!mutation.isSuccess &&
        !linesQuery.isLoading &&
        !linesQuery.isError &&
        options.length === 0 && (
          <p>No unreturned purchase quantities were found for this product.</p>
        )}
      {!mutation.isSuccess && options.length > 0 && (
        <form onSubmit={handleSubmit} className="inventory-form" noValidate>
          <Select
            label="Purchase line"
            value={purchaseLineId}
            onChange={(event) => {
              const nextId = event.target.value;
              setPurchaseLineId(nextId);
              const line = linesQuery.data?.find(
                (candidate) => candidate.purchaseLineId === nextId,
              );
              if (line) setRefundMethod(line.paymentMethod);
              setQuantity('1');
            }}
            placeholder="Select a purchase"
            options={options}
            disabled={mutation.isPending}
          />
          {selectedLine && (
            <p className="adjust-stock__current">
              Purchase quantity: <strong>{selectedLine.quantity}</strong>; previously returned:{' '}
              <strong>{selectedLine.returnedQuantity}</strong>; current stock:{' '}
              <strong>{selectedLine.productStock}</strong>
            </p>
          )}
          <Input
            label="Quantity to return"
            type="number"
            min="1"
            max={maxQuantity}
            step="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            disabled={!selectedLine || maxQuantity < 1 || mutation.isPending}
          />
          <Input
            label="Return date"
            type="date"
            value={returnDate}
            onChange={(event) => setReturnDate(event.target.value)}
            disabled={mutation.isPending}
          />
          <Select
            label="Supplier credit / refund method"
            value={refundMethod}
            onChange={(event) => setRefundMethod(event.target.value as PurchasePaymentMethod)}
            options={[
              { value: 'CASH', label: 'Cash refund' },
              { value: 'BANK', label: 'Bank refund' },
              { value: 'MOBILE', label: 'Mobile wallet refund' },
              { value: 'CREDIT', label: 'Reduce accounts payable' },
            ]}
            disabled={mutation.isPending}
          />
          <Input
            label="Note"
            maxLength={255}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={mutation.isPending}
          />
          {error && (
            <div className="inventory-form__error" role="alert">
              {error}
            </div>
          )}
          <div className="inventory-form__actions">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Close
            </Button>
            <Button
              type="submit"
              loading={mutation.isPending}
              disabled={!selectedLine || maxQuantity < 1 || mutation.isSuccess}
            >
              Post supplier return
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
