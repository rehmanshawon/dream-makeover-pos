import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { ApiError } from '../../../api/api-error';
import { useRevalueInventoryCost } from '../../../api/inventory-hooks';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Modal } from '../../../ui/Modal';
import { formatBdt } from '../../../utils/format';
import './inventory-modal.css';

interface CostRevaluationModalProps {
  open: boolean;
  productId: string;
  productName: string;
  currentStock: number;
  currentUnitCostMinor: number;
  onClose: () => void;
}

function localToday(): string {
  const today = new Date();
  return [today.getFullYear(), today.getMonth() + 1, today.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');
}

export function CostRevaluationModal({
  open,
  productId,
  productName,
  currentStock,
  currentUnitCostMinor,
  onClose,
}: CostRevaluationModalProps): JSX.Element {
  const mutation = useRevalueInventoryCost();
  const [newUnitCost, setNewUnitCost] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(localToday());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNewUnitCost((currentUnitCostMinor / 100).toFixed(2));
      setEffectiveDate(localToday());
      setNote('');
      setError(null);
      mutation.reset();
    }
  }, [open, currentUnitCostMinor]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(newUnitCost.trim());
    if (!match) {
      setError('Enter a unit cost with up to two decimal places');
      return;
    }
    const newUnitCostMinor = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
    if (!Number.isSafeInteger(newUnitCostMinor)) {
      setError('Unit cost exceeds supported limits');
      return;
    }
    try {
      await mutation.mutateAsync({
        productId,
        effectiveDate,
        newUnitCostMinor,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      onClose();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to revalue inventory cost');
    }
  };

  return (
    <Modal
      open={open}
      title={`Revalue inventory cost — ${productName}`}
      onClose={onClose}
      size="sm"
      closeOnOverlayClick={!mutation.isPending}
    >
      <form onSubmit={handleSubmit} className="inventory-form" noValidate>
        <p className="adjust-stock__current">
          On hand: <strong>{currentStock}</strong>; current unit cost:{' '}
          <strong>{formatBdt(currentUnitCostMinor)}</strong>
        </p>
        <Input
          label="New unit cost (BDT)"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          autoFocus
          value={newUnitCost}
          onChange={(event) => setNewUnitCost(event.target.value)}
          disabled={mutation.isPending}
        />
        <Input
          label="Effective date"
          type="date"
          value={effectiveDate}
          onChange={(event) => setEffectiveDate(event.target.value)}
          disabled={mutation.isPending}
        />
        <Input
          label="Reason"
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
          <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Post revaluation
          </Button>
        </div>
      </form>
    </Modal>
  );
}
