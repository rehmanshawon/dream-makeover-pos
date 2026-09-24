import { useEffect, useMemo, useState, type FormEvent, type JSX } from 'react';
import { ApiError } from '../../../api/api-error';
import { useCreatePayPeriod } from '../../../api/payroll-hooks';
import { Button } from '../../../ui/Button';
import { Modal } from '../../../ui/Modal';
import { Select, type SelectOption } from '../../../ui/Select';
import './PayPeriodFormModal.css';

interface PayPeriodFormModalProps {
  open: boolean;
  onClose: () => void;
}

const MONTH_OPTIONS: SelectOption[] = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
].map((label, index) => ({ value: String(index + 1), label }));

function generateYearOptions(): SelectOption[] {
  const now = new Date();
  const years: SelectOption[] = [];
  for (let y = now.getFullYear() - 3; y <= now.getFullYear() + 1; y += 1) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
}

export function PayPeriodFormModal({ open, onClose }: PayPeriodFormModalProps): JSX.Element {
  const now = new Date();

  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreatePayPeriod();
  const yearOptions = useMemo(generateYearOptions, []);

  useEffect(() => {
    if (!open) return;
    setYear(String(now.getFullYear()));
    setMonth(String(now.getMonth() + 1));
    setFormError(null);
  }, [open]);

  // Reject future months beyond the immediately following month.
  const isAllowedMonth = useMemo(() => {
    const y = Number(year);
    const m = Number(month);
    const nextY = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const nextM = now.getMonth() === 11 ? 1 : now.getMonth() + 2;

    const isCurrent = y === now.getFullYear() && m === now.getMonth() + 1;
    const isNext = y === nextY && m === nextM;
    const isPast = y < now.getFullYear() || (y === now.getFullYear() && m < now.getMonth() + 1);

    return isCurrent || isNext || isPast;
  }, [year, month, now]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError(null);

    try {
      await createMutation.mutateAsync({
        year: Number(year),
        month: Number(month),
      });
      onClose();
    } catch (err) {
      if (err instanceof ApiError) setFormError(err.message);
      else setFormError('Unable to create pay period.');
    }
  };

  const submitting = createMutation.isPending;

  return (
    <Modal
      open={open}
      title="New pay period"
      onClose={onClose}
      size="sm"
      closeOnOverlayClick={!submitting}
    >
      <form onSubmit={handleSubmit} className="pay-period-form" noValidate>
        <p className="pay-period-form__intro">
          Pay periods are created automatically at the start of each business month. Choose a month
          to create one manually for testing or setup. Each month can have only one period.
        </p>

        <div className="pay-period-form__grid">
          <Select
            label="Month"
            options={MONTH_OPTIONS}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            disabled={submitting}
          />
          <Select
            label="Year"
            options={yearOptions}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            disabled={submitting}
          />
        </div>

        {!isAllowedMonth && (
          <div className="pay-period-form__warning" role="alert">
            Pay periods can be created for past and current months, and at most one month ahead.
          </div>
        )}

        {formError && (
          <div className="pay-period-form__error" role="alert">
            {formError}
          </div>
        )}

        <div className="pay-period-form__actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting} disabled={!isAllowedMonth}>
            Create period
          </Button>
        </div>
      </form>
    </Modal>
  );
}
