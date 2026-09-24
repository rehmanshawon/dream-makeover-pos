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
import {
  BONUS_TYPE_LABELS,
  type BonusType,
  type SalaryPaymentType,
  type SalaryPaymentMethod,
} from '../../../types/salary-payments';
import './SalaryPaymentFormModal.css';

const TYPE_OPTIONS: SelectOption[] = [
  { value: 'BONUS', label: 'Bonus' },
  { value: 'OVERTIME', label: 'Overtime' },
  { value: 'ADVANCE', label: 'Advance' },
];

const METHOD_OPTIONS: SelectOption[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK', label: 'Cheque' },
  { value: 'MOBILE', label: 'Mobile banking' },
];

const BONUS_OPTIONS: SelectOption[] = (Object.keys(BONUS_TYPE_LABELS) as BonusType[]).map(
  (value) => ({ value, label: BONUS_TYPE_LABELS[value] }),
);

const OVERTIME_HOUR_OPTIONS: SelectOption[] = Array.from({ length: 12 }, (_, index) => {
  const value = String(index + 1);
  return { value, label: `${value} ${value === '1' ? 'hour' : 'hours'}` };
});

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
  bonusType: BonusType | '';
  overtimeHours: string;
  overtimeDate: string;
  checkNumber: string;
  mobileWalletNumber: string;
}

interface FormErrors {
  amountTaka?: string;
  paidOn?: string;
  bonusType?: string;
  overtimeHours?: string;
  overtimeDate?: string;
  checkNumber?: string;
  mobileWalletNumber?: string;
}

function frequencyNoun(frequency: SalaryFrequency): string {
  if (frequency === 'MONTHLY') return 'month';
  if (frequency === 'WEEKLY') return 'week';
  return 'day';
}

function defaultForm(employee: Employee): FormState {
  return {
    amountTaka: minorToTakaInput(employee.salaryMinor),
    paymentType: 'BONUS',
    paymentMethod: 'CASH',
    paidOn: todayIso(),
    note: '',
    bonusType: '',
    overtimeHours: '',
    overtimeDate: '',
    checkNumber: '',
    mobileWalletNumber: '',
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

    if (form.paymentType === 'BONUS' && !form.bonusType) {
      nextErrors.bonusType = 'Select a bonus type';
    }
    if (form.paymentType === 'OVERTIME') {
      const hours = Number(form.overtimeHours);
      if (!Number.isInteger(hours) || hours < 1 || hours > 12) {
        nextErrors.overtimeHours = 'Select between 1 and 12 hours';
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(form.overtimeDate)) {
        nextErrors.overtimeDate = 'Enter the overtime work date';
      }
    }
    if (form.paymentMethod === 'BANK' && !form.checkNumber.trim()) {
      nextErrors.checkNumber = 'Enter the cheque number';
    }
    if (form.paymentMethod === 'MOBILE' && !form.mobileWalletNumber.trim()) {
      nextErrors.mobileWalletNumber = 'Enter the mobile number';
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
        ...(form.paymentType === 'BONUS' ? { bonusType: form.bonusType as BonusType } : {}),
        ...(form.paymentType === 'OVERTIME'
          ? { overtimeHours: Number(form.overtimeHours), overtimeDate: form.overtimeDate }
          : {}),
        ...(form.paymentMethod === 'BANK' ? { checkNumber: form.checkNumber.trim() } : {}),
        ...(form.paymentMethod === 'MOBILE'
          ? { mobileWalletNumber: form.mobileWalletNumber.trim() }
          : {}),
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

          {form.paymentType === 'BONUS' && (
            <Select
              label="Bonus type"
              options={BONUS_OPTIONS}
              placeholder="Select bonus type"
              value={form.bonusType}
              onChange={(e) =>
                setForm((s) => ({ ...s, bonusType: e.target.value as BonusType | '' }))
              }
              {...(errors.bonusType ? { error: errors.bonusType } : {})}
              disabled={submitting}
            />
          )}

          {form.paymentType === 'OVERTIME' && (
            <>
              <Select
                label="Overtime hours"
                options={OVERTIME_HOUR_OPTIONS}
                placeholder="Select hours"
                value={form.overtimeHours}
                onChange={(e) => setForm((s) => ({ ...s, overtimeHours: e.target.value }))}
                {...(errors.overtimeHours ? { error: errors.overtimeHours } : {})}
                disabled={submitting}
              />
              <Input
                label="Overtime work date"
                type="date"
                value={form.overtimeDate}
                onChange={(e) => setForm((s) => ({ ...s, overtimeDate: e.target.value }))}
                {...(errors.overtimeDate ? { error: errors.overtimeDate } : {})}
                disabled={submitting}
              />
            </>
          )}

          {form.paymentMethod === 'BANK' && (
            <Input
              label="Cheque number"
              type="text"
              value={form.checkNumber}
              onChange={(e) => setForm((s) => ({ ...s, checkNumber: e.target.value }))}
              {...(errors.checkNumber ? { error: errors.checkNumber } : {})}
              disabled={submitting}
            />
          )}

          {form.paymentMethod === 'MOBILE' && (
            <Input
              label="Mobile number"
              type="tel"
              value={form.mobileWalletNumber}
              onChange={(e) => setForm((s) => ({ ...s, mobileWalletNumber: e.target.value }))}
              {...(errors.mobileWalletNumber ? { error: errors.mobileWalletNumber } : {})}
              disabled={submitting}
            />
          )}
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
