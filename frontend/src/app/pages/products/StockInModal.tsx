import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Textarea } from '../../../ui/Textarea';
import { Modal } from '../../../ui/Modal';
import { ApiError } from '../../../api/api-error';
import { useStockIn } from '../../../api/inventory-hooks';
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
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useStockIn();

  useEffect(() => {
    if (open) {
      setQuantity('1');
      setNote('');
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

    try {
      await mutation.mutateAsync({
        productId,
        quantity: qty,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to record stock-in');
    }
  };

  return (
    <Modal
      open={open}
      title={`Stock in — ${productName}`}
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

        <Textarea
          label="Note (optional)"
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
            Add stock
          </Button>
        </div>
      </form>
    </Modal>
  );
}
