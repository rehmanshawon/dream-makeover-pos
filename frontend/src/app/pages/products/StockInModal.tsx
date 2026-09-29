import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Select } from '../../../ui/Select';
import { Modal } from '../../../ui/Modal';
import { ApiError } from '../../../api/api-error';
import { useCreatePurchase } from '../../../api/purchase-hooks';
import './inventory-modal.css';

interface StockInModalProps {
  open: boolean;
  productId: string;
  productName: string;
  onClose: () => void;
}

export function StockInModal({
  open,
  productId,
  productName,
  onClose,
}: StockInModalProps): JSX.Element {
  const [quantity, setQuantity] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierReference, setSupplierReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [error, setError] = useState<string | null>(null);

  const mutation = useCreatePurchase();

  useEffect(() => {
    if (open) {
      setQuantity('1');
      setUnitCost('');
      setPurchaseDate(new Date().toLocaleDateString('en-CA'));
      setSupplierName('');
      setSupplierReference('');
      setPaymentMethod('CASH');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      setError('Quantity must be a positive integer');
      return;
    }
    const costMatch = /^(\d+)(?:\.(\d{1,2}))?$/.exec(unitCost.trim());
    if (!costMatch) {
      setError('Enter a unit cost with up to two decimal places');
      return;
    }
    const unitCostMinor = Number(costMatch[1]) * 100 + Number((costMatch[2] ?? '').padEnd(2, '0'));
    if (!Number.isSafeInteger(unitCostMinor) || unitCostMinor < 1) {
      setError('Unit cost must be greater than zero and within supported limits');
      return;
    }

    try {
      await mutation.mutateAsync({
        purchaseDate,
        ...(supplierName.trim() ? { supplierName: supplierName.trim() } : {}),
        ...(supplierReference.trim() ? { supplierReference: supplierReference.trim() } : {}),
        paymentMethod: paymentMethod as 'CASH' | 'BANK' | 'MOBILE' | 'CREDIT',
        lines: [{ productId, quantity: qty, unitCostMinor }],
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to record stock-in');
    }
  };

  return (
    <Modal
      open={open}
      title={`Receive purchase — ${productName}`}
      onClose={onClose}
      size="sm"
      closeOnOverlayClick={!mutation.isPending}
    >
      <form onSubmit={handleSubmit} className="inventory-form" noValidate>
        <Input
          label="Quantity"
          inputMode="numeric"
          autoFocus
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          disabled={mutation.isPending}
        />

        <Input
          label="Unit cost (BDT)"
          type="number"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          value={unitCost}
          onChange={(e) => setUnitCost(e.target.value)}
          disabled={mutation.isPending}
        />

        <Input
          label="Purchase date"
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
          disabled={mutation.isPending}
        />

        <Input
          label="Supplier (optional)"
          value={supplierName}
          onChange={(e) => setSupplierName(e.target.value)}
          disabled={mutation.isPending}
        />

        <Input
          label="Supplier reference (optional)"
          value={supplierReference}
          onChange={(e) => setSupplierReference(e.target.value)}
          disabled={mutation.isPending}
        />

        <Select
          label="Payment method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          options={[
            { value: 'CASH', label: 'Cash' },
            { value: 'BANK', label: 'Bank' },
            { value: 'MOBILE', label: 'Mobile wallet' },
            { value: 'CREDIT', label: 'On credit' },
          ]}
          disabled={mutation.isPending}
        />

        {error && (
          <div className="inventory-form__error" role="alert">
            {error}
          </div>
        )}

        <div className="inventory-form__actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Record purchase
          </Button>
        </div>
      </form>
    </Modal>
  );
}
