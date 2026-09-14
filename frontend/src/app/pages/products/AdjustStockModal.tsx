import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Textarea } from '../../../ui/Textarea';
import { Modal } from '../../../ui/Modal';
import { ApiError } from '../../../api/api-error';
import { useAdjustStock } from '../../../api/inventory-hooks';
import './inventory-modal.css';

interface AdjustStockModalProps {
  open: boolean;
  productId: string;
  productName: string;
  currentStock: number;
  onClose: () => void;
}

export function AdjustStockModal({
  open,
  productId,
  productName,
  currentStock,
  onClose,
}: AdjustStockModalProps): JSX.Element {
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useAdjustStock();

  useEffect(() => {
    if (open) {
      setDelta('');
      setNote('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);

    const value = Number(delta);
    if (!Number.isInteger(value) || value === 0) {
      setError('Delta must be a non-zero integer');
      return;
    }

    const trimmedNote = note.trim();
    if (trimmedNote.length < 1) {
      setError('A note is required for stock adjustments');
      return;
    }

    try {
      await mutation.mutateAsync({
        productId,
        delta: value,
        note: trimmedNote,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to record adjustment');
    }
  };

  return (
    <Modal
      open={open}
      title={`Adjust stock — ${productName}`}
      onClose={onClose}
      size="sm"
      closeOnOverlayClick={!mutation.isPending}
    >
      <form onSubmit={handleSubmit} className="inventory-form" noValidate>
        <p className="adjust-stock__current">
          Current stock: <strong>{currentStock}</strong>
        </p>

        <Input
          label="Change (+/-)"
          inputMode="numeric"
          autoFocus
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          hint="Use a negative number to remove stock (damage, loss)"
          disabled={mutation.isPending}
        />

        <Textarea
          label="Reason (required)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
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
            Apply adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
