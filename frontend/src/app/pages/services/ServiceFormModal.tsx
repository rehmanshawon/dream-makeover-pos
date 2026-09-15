import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { ApiError } from '../../../api/api-error';
import { useCreateService } from '../../../api/salon-service-hooks';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Modal } from '../../../ui/Modal';
import { parseTakaToMinor } from '../../../utils/format';
import './ServiceFormModal.css';

interface ServiceFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (serviceId: string) => void;
}

interface FormState {
  name: string;
  priceTaka: string;
  durationMinutes: string;
  rewardPointWeight: string;
}

interface FormErrors {
  name?: string;
  priceTaka?: string;
  durationMinutes?: string;
  rewardPointWeight?: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  priceTaka: '',
  durationMinutes: '60',
  rewardPointWeight: '1',
};

export function ServiceFormModal({ open, onClose, onCreated }: ServiceFormModalProps): JSX.Element {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateService();

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setErrors({});
      setFormError(null);
    }
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const nextErrors: FormErrors = {};

    const trimmedName = form.name.trim();
    if (trimmedName.length < 2) {
      nextErrors.name = 'Name must be at least 2 characters';
    }

    const priceMinor = parseTakaToMinor(form.priceTaka);
    if (priceMinor === null || priceMinor <= 0) {
      nextErrors.priceTaka = 'Enter a price greater than 0';
    }

    const duration = Number(form.durationMinutes);
    if (!Number.isInteger(duration) || duration < 1) {
      nextErrors.durationMinutes = 'Duration must be a positive integer';
    }

    const rewardWeight = Number(form.rewardPointWeight);
    if (!Number.isInteger(rewardWeight) || rewardWeight < 0) {
      nextErrors.rewardPointWeight = 'Reward weight must be a non-negative integer';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        name: trimmedName,
        priceMinor: priceMinor as number,
        durationMinutes: duration as number,
        rewardPointWeight: rewardWeight as number,
        active: true,
      });
      onCreated?.(created.id);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Unable to save service. Please try again.');
      }
    }
  };

  const submitting = createMutation.isPending;

  return (
    <Modal
      open={open}
      title="New service"
      onClose={onClose}
      size="md"
      closeOnOverlayClick={!submitting}
    >
      <form onSubmit={handleSubmit} className="service-form" noValidate>
        <Input
          label="Name"
          autoFocus
          value={form.name}
          onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          {...(errors.name ? { error: errors.name } : {})}
          disabled={submitting}
          placeholder="e.g. Bridal Facial"
        />

        <div className="service-form__grid">
          <Input
            label="Price (৳)"
            inputMode="decimal"
            value={form.priceTaka}
            onChange={(e) => setForm((s) => ({ ...s, priceTaka: e.target.value }))}
            {...(errors.priceTaka ? { error: errors.priceTaka } : {})}
            disabled={submitting}
          />

          <Input
            label="Duration (minutes)"
            inputMode="numeric"
            value={form.durationMinutes}
            onChange={(e) => setForm((s) => ({ ...s, durationMinutes: e.target.value }))}
            {...(errors.durationMinutes ? { error: errors.durationMinutes } : {})}
            disabled={submitting}
          />
        </div>

        <Input
          label="Reward point weight"
          inputMode="numeric"
          value={form.rewardPointWeight}
          onChange={(e) => setForm((s) => ({ ...s, rewardPointWeight: e.target.value }))}
          {...(errors.rewardPointWeight ? { error: errors.rewardPointWeight } : {})}
          hint="Points earned per ৳100 spent. Use 1 for standard, 2 for premium."
          disabled={submitting}
        />

        {formError && (
          <div className="service-form__error" role="alert">
            {formError}
          </div>
        )}

        <div className="service-form__actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Create service
          </Button>
        </div>
      </form>
    </Modal>
  );
}
