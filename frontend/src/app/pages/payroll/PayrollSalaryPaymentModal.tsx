import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { ApiError } from '../../../api/api-error';
import { useCreatePayrollSalaryPayment } from '../../../api/payroll-hooks';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Modal } from '../../../ui/Modal';
import { Select } from '../../../ui/Select';
import { Textarea } from '../../../ui/Textarea';
import { minorToTakaInput, parseTakaToMinor, todayIso } from '../../../utils/format';
import type { PayableEmployee } from '../../../types/payroll';
import type { SalaryPaymentMethod } from '../../../types/salary-payments';

interface Props {
  open: boolean;
  periodId: string;
  employee: PayableEmployee | null;
  onClose: () => void;
}

interface FormState {
  amountTaka: string;
  paymentMethod: SalaryPaymentMethod;
  paidOn: string;
  checkNumber: string;
  bankAccountNumber: string;
  mobileWalletProvider: string;
  mobileWalletNumber: string;
  note: string;
}

const defaultForm = (employee: PayableEmployee): FormState => ({
  amountTaka: minorToTakaInput(employee.remainingMinor),
  paymentMethod: 'CASH',
  paidOn: todayIso(),
  checkNumber: '',
  bankAccountNumber: '',
  mobileWalletProvider: 'bKash',
  mobileWalletNumber: '',
  note: '',
});

export function PayrollSalaryPaymentModal({
  open,
  periodId,
  employee,
  onClose,
}: Props): JSX.Element {
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useCreatePayrollSalaryPayment();

  useEffect(() => {
    if (open && employee) {
      setForm(defaultForm(employee));
      setError(null);
    }
  }, [open, employee]);

  if (!employee || !form) return <></>;

  const submitting = mutation.isPending;
  const update = (changes: Partial<FormState>): void =>
    setForm((current) => ({ ...current!, ...changes }));

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    const amountMinor = parseTakaToMinor(form.amountTaka);
    if (amountMinor === null || amountMinor <= 0 || amountMinor > employee.remainingMinor) {
      setError(`Enter an amount from 0.01 to ${minorToTakaInput(employee.remainingMinor)}.`);
      return;
    }
    if (
      form.paymentMethod === 'BANK' &&
      !form.checkNumber.trim() &&
      !form.bankAccountNumber.trim()
    ) {
      setError('Enter a check number or bank account number.');
      return;
    }
    if (form.paymentMethod === 'MOBILE' && !form.mobileWalletNumber.trim()) {
      setError('Enter a mobile wallet number.');
      return;
    }
    try {
      await mutation.mutateAsync({
        periodId,
        payload: {
          employeeId: employee.employeeId,
          amountMinor,
          paymentMethod: form.paymentMethod,
          paidOn: form.paidOn,
          ...(form.checkNumber.trim() ? { checkNumber: form.checkNumber.trim() } : {}),
          ...(form.bankAccountNumber.trim()
            ? { bankAccountNumber: form.bankAccountNumber.trim() }
            : {}),
          ...(form.paymentMethod === 'MOBILE'
            ? {
                mobileWalletProvider: form.mobileWalletProvider as 'bKash' | 'Rocket' | 'Nagad',
                mobileWalletNumber: form.mobileWalletNumber.trim(),
              }
            : {}),
          ...(form.note.trim() ? { note: form.note.trim() } : {}),
        },
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to record salary payment.');
    }
  };

  return (
    <Modal open={open} title={`Pay salary - ${employee.employeeName}`} onClose={onClose} size="md">
      <form onSubmit={submit} className="payment-form" noValidate>
        <p className="payment-form__context">
          Current salary: <strong>{minorToTakaInput(employee.currentObligationMinor)}৳</strong> |
          Arrears: <strong>{minorToTakaInput(employee.carriedArrearsMinor)}৳</strong> | Remaining:{' '}
          <strong>{minorToTakaInput(employee.remainingMinor)}৳</strong>
        </p>
        <div className="payment-form__grid">
          <Input
            label="Amount (৳)"
            inputMode="decimal"
            autoFocus
            value={form.amountTaka}
            onChange={(e) => update({ amountTaka: e.target.value })}
            disabled={submitting}
          />
          <Input
            label="Payment date"
            type="date"
            value={form.paidOn}
            onChange={(e) => update({ paidOn: e.target.value })}
            disabled={submitting}
          />
          <Select
            label="Payment method"
            options={[
              { value: 'CASH', label: 'Cash' },
              { value: 'BANK', label: 'Bank' },
              { value: 'MOBILE', label: 'Mobile wallet' },
            ]}
            value={form.paymentMethod}
            onChange={(e) => update({ paymentMethod: e.target.value as SalaryPaymentMethod })}
            disabled={submitting}
          />
        </div>
        {form.paymentMethod === 'BANK' && (
          <div className="payment-form__grid">
            <Input
              label="Check number (optional)"
              value={form.checkNumber}
              onChange={(e) => update({ checkNumber: e.target.value })}
              disabled={submitting}
            />
            <Input
              label="Bank account number (optional)"
              value={form.bankAccountNumber}
              onChange={(e) => update({ bankAccountNumber: e.target.value })}
              disabled={submitting}
            />
          </div>
        )}
        {form.paymentMethod === 'MOBILE' && (
          <div className="payment-form__grid">
            <Select
              label="Wallet provider"
              options={[
                { value: 'bKash', label: 'bKash' },
                { value: 'Rocket', label: 'Rocket' },
                { value: 'Nagad', label: 'Nagad' },
              ]}
              value={form.mobileWalletProvider}
              onChange={(e) => update({ mobileWalletProvider: e.target.value })}
              disabled={submitting}
            />
            <Input
              label="Wallet number"
              value={form.mobileWalletNumber}
              onChange={(e) => update({ mobileWalletNumber: e.target.value })}
              disabled={submitting}
            />
          </div>
        )}
        <Textarea
          label="Note (optional)"
          value={form.note}
          onChange={(e) => update({ note: e.target.value })}
          disabled={submitting}
        />
        {error && (
          <div className="payment-form__error" role="alert">
            {error}
          </div>
        )}
        <div className="payment-form__actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Record salary payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
