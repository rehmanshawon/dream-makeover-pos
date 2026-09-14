import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Modal } from '../../../ui/Modal';
import { ApiError } from '../../../api/api-error';
import { useCreateCustomer, useUpdateCustomer } from '../../../api/customer-hooks';
import './CustomerFormModal.css';
import { Customer } from '@/types/customers';

interface CustomerFormModalProps {
  open: boolean;
  customer?: Customer;
  onClose: () => void;
  onSaved?: (customer: Customer) => void;
}

interface FormState {
  fullName: string;
  phoneNumber: string;
}

const EMPTY_FORM: FormState = { fullName: '', phoneNumber: '' };

export function CustomerFormModal({
  open,
  customer,
  onClose,
  onSaved,
}: CustomerFormModalProps): JSX.Element {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<FormState>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateCustomer();

  const updateMutation = useUpdateCustomer();
  const isEdit = Boolean(customer);
  const submitting = isEdit ? updateMutation.isPending : createMutation.isPending;

  useEffect(() => {
    if (!open) return;

    if (customer) {
      setForm({
        fullName: customer.fullName,
        phoneNumber: customer.phoneNumber,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setFieldErrors({});
    setFormError(null);
  }, [open, customer]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const trimmedName = form.fullName.trim();
    const trimmedPhone = form.phoneNumber.trim();

    const nextErrors: Partial<FormState> = {};
    if (trimmedName.length < 3) {
      nextErrors.fullName = 'Name must be at least 3 characters';
    }
    if (!/^[0-9+\-\s()]+$/.test(trimmedPhone) || trimmedPhone.length < 10) {
      nextErrors.phoneNumber = 'Enter a valid phone number';
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    try {
      let saved: Customer;
      if (isEdit && customer) {
        saved = await updateMutation.mutateAsync({
          id: customer.id,
          payload: {
            fullName: trimmedName,
            phoneNumber: trimmedPhone,
          },
        });
      } else {
        saved = await createMutation.mutateAsync({
          fullName: trimmedName,
          phoneNumber: trimmedPhone,
        });
      }
      onSaved?.(saved);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setFieldErrors({ phoneNumber: 'A customer with this phone number already exists' });
        } else {
          setFormError(err.message);
        }
      } else {
        setFormError('Unable to save customer. Please try again.');
      }
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit customer' : 'New customer'}
      onClose={onClose}
      closeOnOverlayClick={!submitting}
    >
      <form onSubmit={handleSubmit} className="customer-form" noValidate>
        <Input
          label="Full name"
          autoFocus
          value={form.fullName}
          onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))}
          {...(fieldErrors.fullName ? { error: fieldErrors.fullName } : {})}
          disabled={submitting}
        />

        <Input
          label="Phone number"
          inputMode="tel"
          value={form.phoneNumber}
          onChange={(e) => setForm((s) => ({ ...s, phoneNumber: e.target.value }))}
          {...(fieldErrors.phoneNumber ? { error: fieldErrors.phoneNumber } : {})}
          hint="Used to identify returning customers"
          disabled={submitting}
        />

        {formError && (
          <div className="customer-form__error" role="alert">
            {formError}
          </div>
        )}

        <div className="customer-form__actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? 'Save changes' : 'Create customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
