import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { ApiError } from '../../../api/api-error';
import { useCreateSalaryPayment } from '../../../api/salary-payment-hooks';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Modal } from '../../../ui/Modal';
import { Select, type SelectOption } from '../../../ui/Select';
import { Textarea } from '../../../ui/Textarea';
import { minorToTakaInput, parseTakaToMinor, todayIso } from '../../../utils/format';
import type { Employee, SalaryFrequency } from '../../../types/employees';
import type { SalaryPaymentType, SalaryPaymentMethod } from '../../../types/salary-payments';
import './SalaryPaymentFormModal.css';

const TYPE_OPTIONS: SelectOption[] = [
  { value: 'REGULAR', label: 'Regular salary' },
  { value: 'BONUS', label: 'Bonus' },
  { value: 'OVERTIME', label: 'Overtime' },
  { value: 'ADVANCE', label: 'Advance' },
];

const METHOD_OPTIONS: SelectOption[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK', label: 'Bank transfer' },
  { value: 'MOBILE', label: 'Mobile banking' },
];

interface SalaryPaymentFormModalProps {
  open: boolean;
  employee: Employee;
  onClose: () => void;
}

interface FormState {
  amountTaka: string;
  paymentType: SalaryPaymentType;
  paymentMethod: SalaryPaymentMethod;
  paidOn: string;
  note: string;
}

interface FormErrors {
  amountTaka?: string;
  paidOn?: string;
}

function frequencyNoun(frequency: SalaryFrequency): string {
  if (frequency === 'MONTHLY') return 'month';
  if (frequency === 'WEEKLY') return 'week';
  return 'day';
}

function defaultForm(employee: Employee): FormState {
  return {
    amountTaka: minorToTakaInput(employee.salaryMinor),
    paymentType: 'REGULAR',
    paymentMethod: 'CASH',
    paidOn: todayIso(),
    note: '',
  };
}

export function SalaryPaymentFormModal({
  open,
  employee,
  onClose,
}: SalaryPaymentFormModalProps): JSX.Element {
  const [form, setForm] = useState<FormState>(() => defaultForm(employee));
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateSalaryPayment();

  useEffect(() => {
    if (open) {
      setForm(defaultForm(employee));
      setErrors({});
      setFormError(null);
    }
  }, [open, employee]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const nextErrors: FormErrors = {};

    const amountMinor = parseTakaToMinor(form.amountTaka);
    if (amountMinor === null || amountMinor <= 0) {
      nextErrors.amountTaka = 'Enter an amount greater than 0';
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.paidOn)) {
      nextErrors.paidOn = 'Enter a valid date';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      await createMutation.mutateAsync({
        employeeId: employee.id,
        amountMinor: amountMinor as number,
        paymentType: form.paymentType,
        paymentMethod: form.paymentMethod,
        paidOn: form.paidOn,
        ...(form.note.trim() ? { note: form.note.trim() } : {}),
      });
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Unable to record payment. Please try again.');
      }
    }
  };

  const submitting = createMutation.isPending;

  return (
    <Modal
      open={open}
      title={`Record payment — ${employee.fullName}`}
      onClose={onClose}
      size="md"
      closeOnOverlayClick={!submitting}
    >
      <form onSubmit={handleSubmit} className="payment-form" noValidate>
        <p className="payment-form__context">
          Configured salary:{' '}
          <strong>
            {minorToTakaInput(employee.salaryMinor)}৳ per {frequencyNoun(employee.salaryFrequency)}
          </strong>
        </p>

        <div className="payment-form__grid">
          <Input
            label="Amount (৳)"
            inputMode="decimal"
            autoFocus
            value={form.amountTaka}
            onChange={(e) => setForm((s) => ({ ...s, amountTaka: e.target.value }))}
            {...(errors.amountTaka ? { error: errors.amountTaka } : {})}
            disabled={submitting}
          />

          <Input
            label="Payment date"
            type="date"
            value={form.paidOn}
            onChange={(e) => setForm((s) => ({ ...s, paidOn: e.target.value }))}
            {...(errors.paidOn ? { error: errors.paidOn } : {})}
            disabled={submitting}
          />

          <Select
            label="Payment type"
            options={TYPE_OPTIONS}
            value={form.paymentType}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                paymentType: e.target.value as SalaryPaymentType,
              }))
            }
            disabled={submitting}
          />

          <Select
            label="Payment method"
            options={METHOD_OPTIONS}
            value={form.paymentMethod}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                paymentMethod: e.target.value as SalaryPaymentMethod,
              }))
            }
            disabled={submitting}
          />
        </div>

        <Textarea
          label="Note (optional)"
          value={form.note}
          onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
          disabled={submitting}
          placeholder="e.g. Eid bonus, overtime for weekend events"
        />

        {formError && (
          <div className="payment-form__error" role="alert">
            {formError}
          </div>
        )}

        <div className="payment-form__actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Record payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
