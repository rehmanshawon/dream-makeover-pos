import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { ApiError } from '../../../api/api-error';
import { useCreatePayPeriod, useUpdatePayPeriod } from '../../../api/payroll-hooks';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Modal } from '../../../ui/Modal';
import type { PayPeriod } from '../../../types/payroll';
import './PayPeriodFormModal.css';

interface PayPeriodFormModalProps {
  open: boolean;
  payPeriod?: PayPeriod;
  onClose: () => void;
  onSaved?: (id: string) => void;
}

interface FormState {
  name: string;
  startDate: string;
  endDate: string;
}

interface FormErrors {
  name?: string;
  startDate?: string;
  endDate?: string;
}

function formFromPeriod(p: PayPeriod): FormState {
  return { name: p.name, startDate: p.startDate, endDate: p.endDate };
}

export function PayPeriodFormModal({
  open,
  payPeriod,
  onClose,
  onSaved,
}: PayPeriodFormModalProps): JSX.Element {
  const isEdit = Boolean(payPeriod);
  const [form, setForm] = useState<FormState>({
    name: '',
    startDate: '',
    endDate: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreatePayPeriod();
  const updateMutation = useUpdatePayPeriod();

  useEffect(() => {
    if (!open) return;
    setForm(payPeriod ? formFromPeriod(payPeriod) : { name: '', startDate: '', endDate: '' });
    setErrors({});
    setFormError(null);
  }, [open, payPeriod]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const nextErrors: FormErrors = {};
    if (form.name.trim().length < 2) {
      nextErrors.name = 'Name must be at least 2 characters';
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.startDate)) {
      nextErrors.startDate = 'Enter a valid date';
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.endDate)) {
      nextErrors.endDate = 'Enter a valid date';
    } else if (form.startDate && form.endDate < form.startDate) {
      nextErrors.endDate = 'End date must be on or after start date';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      if (isEdit && payPeriod) {
        const updated = await updateMutation.mutateAsync({
          id: payPeriod.id,
          payload: {
            name: form.name.trim(),
            startDate: form.startDate,
            endDate: form.endDate,
          },
        });
        onSaved?.(updated.id);
      } else {
        const created = await createMutation.mutateAsync({
          name: form.name.trim(),
          startDate: form.startDate,
          endDate: form.endDate,
        });
        onSaved?.(created.id);
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError) setFormError(err.message);
      else setFormError('Unable to save pay period.');
    }
  };

  const submitting = isEdit ? updateMutation.isPending : createMutation.isPending;

  return (
    <Modal
      open={open}
      title={isEdit ? `Edit ${payPeriod?.name}` : 'New pay period'}
      onClose={onClose}
      size="md"
      closeOnOverlayClick={!submitting}
    >
      <form onSubmit={handleSubmit} className="pay-period-form" noValidate>
        <Input
          label="Name"
          autoFocus
          value={form.name}
          onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          {...(errors.name ? { error: errors.name } : {})}
          disabled={submitting}
          placeholder="e.g. September 2026 — First Half"
        />

        <div className="pay-period-form__grid">
          <Input
            label="Start date"
            type="date"
            value={form.startDate}
            onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))}
            {...(errors.startDate ? { error: errors.startDate } : {})}
            disabled={submitting}
          />
          <Input
            label="End date"
            type="date"
            value={form.endDate}
            onChange={(e) => setForm((s) => ({ ...s, endDate: e.target.value }))}
            {...(errors.endDate ? { error: errors.endDate } : {})}
            disabled={submitting}
          />
        </div>

        {formError && (
          <div className="pay-period-form__error" role="alert">
            {formError}
          </div>
        )}

        <div className="pay-period-form__actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? 'Save changes' : 'Create period'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
