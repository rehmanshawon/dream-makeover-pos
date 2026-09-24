import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { ApiError } from '../../../api/api-error';
import { useAdjustAdvance } from '../../../api/payroll-hooks';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Modal } from '../../../ui/Modal';
import { minorToTakaInput, parseTakaToMinor } from '../../../utils/format';
import type { PayableEmployee } from '../../../types/payroll';

interface Props {
  open: boolean;
  periodId: string;
  employee: PayableEmployee | null;
  onClose: () => void;
}

export function AdvanceAdjustmentModal({ open, periodId, employee, onClose }: Props): JSX.Element {
  const [amountTaka, setAmountTaka] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useAdjustAdvance();

  useEffect(() => {
    if (open && employee) {
      setAmountTaka(minorToTakaInput(employee.advanceMinor));
      setError(null);
    }
  }, [open, employee]);

  if (!employee) return <></>;

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    const amountMinor = parseTakaToMinor(amountTaka);
    if (amountMinor === null || amountMinor <= 0 || amountMinor > employee.advanceMinor) {
      setError(`Enter an amount from 0.01 to ${minorToTakaInput(employee.advanceMinor)}.`);
      return;
    }
    try {
      await mutation.mutateAsync({
        periodId,
        payload: { employeeId: employee.employeeId, amountMinor },
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to adjust advance.');
    }
  };

  return (
    <Modal
      open={open}
      title={`Adjust advance - ${employee.employeeName}`}
      onClose={onClose}
      size="sm"
    >
      <form onSubmit={submit} className="payment-form" noValidate>
        <p className="payment-form__context">
          Outstanding advance: <strong>{minorToTakaInput(employee.advanceMinor)}৳</strong>
        </p>
        <Input
          label="Adjustment amount (৳)"
          inputMode="decimal"
          autoFocus
          value={amountTaka}
          onChange={(event) => setAmountTaka(event.target.value)}
          disabled={mutation.isPending}
        />
        {error && (
          <div className="payment-form__error" role="alert">
            {error}
          </div>
        )}
        <div className="payment-form__actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Adjust advance
          </Button>
        </div>
      </form>
    </Modal>
  );
}
