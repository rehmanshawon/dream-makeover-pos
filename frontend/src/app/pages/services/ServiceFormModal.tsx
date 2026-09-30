import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { ApiError } from '../../../api/api-error';
import { useCreateService, useUpdateService } from '../../../api/salon-service-hooks';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Modal } from '../../../ui/Modal';
import { minorToTakaInput, parseTakaToMinor } from '../../../utils/format';
import type { SalonService } from '../../../types/services';
import './ServiceFormModal.css';

interface ServiceFormModalProps {
  open: boolean;
  service?: SalonService;
  categoryId?: string;
  onClose: () => void;
  onSaved?: (serviceId: string) => void;
}

interface FormState {
  name: string;
  priceTaka: string;
  durationMinutes: string;
}

interface FormErrors {
  name?: string;
  priceTaka?: string;
  durationMinutes?: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  priceTaka: '',
  durationMinutes: '60',
};

function formFromService(service: SalonService): FormState {
  return {
    name: service.name,
    priceTaka: minorToTakaInput(service.priceMinor),
    durationMinutes: String(service.durationMinutes),
  };
}

export function ServiceFormModal({
  open,
  service,
  categoryId,
  onClose,
  onSaved,
}: ServiceFormModalProps): JSX.Element {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const isEdit = Boolean(service);
  const createMutation = useCreateService();
  const updateMutation = useUpdateService();

  useEffect(() => {
    if (!open) return;
    setForm(service ? formFromService(service) : EMPTY_FORM);
    setErrors({});
    setFormError(null);
  }, [open, service]);

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

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      name: trimmedName,
      priceMinor: priceMinor as number,
      durationMinutes: duration as number,
    };

    try {
      if (isEdit && service) {
        const updated = await updateMutation.mutateAsync({
          id: service.id,
          payload,
        });
        onSaved?.(updated.id);
      } else {
        const created = await createMutation.mutateAsync({
          ...payload,
          active: true,
          ...(categoryId ? { categoryId } : {}),
        });
        onSaved?.(created.id);
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Unable to save service. Please try again.');
      }
    }
  };

  const submitting = isEdit ? updateMutation.isPending : createMutation.isPending;

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit service' : 'New service'}
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
            {isEdit ? 'Save changes' : 'Create service'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
