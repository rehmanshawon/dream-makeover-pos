import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { ApiError } from '../../../api/api-error';
import { useCreateExpense, useUpdateExpense } from '../../../api/expense-hooks';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Modal } from '../../../ui/Modal';
import { Select, type SelectOption } from '../../../ui/Select';
import { Textarea } from '../../../ui/Textarea';
import { minorToTakaInput, parseTakaToMinor, todayIso } from '../../../utils/format';
import { formatCategoryLabel } from '../dashboard/category-labels';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_PAYMENT_METHOD_LABELS,
  type Expense,
  type ExpenseCategory,
  type ExpensePaymentMethod,
} from '../../../types/expenses';
import './ExpenseFormModal.css';

const CATEGORY_OPTIONS: SelectOption[] = EXPENSE_CATEGORIES.map((c) => ({
  value: c,
  label: formatCategoryLabel(c),
}));

const METHOD_OPTIONS: SelectOption[] = EXPENSE_PAYMENT_METHODS.map((m) => ({
  value: m,
  label: EXPENSE_PAYMENT_METHOD_LABELS[m],
}));

interface ExpenseFormModalProps {
  open: boolean;
  expense?: Expense;
  onClose: () => void;
  onSaved?: (expenseId: string) => void;
}

interface FormState {
  category: ExpenseCategory;
  amountTaka: string;
  expenseDate: string;
  paymentMethod: ExpensePaymentMethod;
  payee: string;
  reference: string;
  note: string;
}

interface FormErrors {
  amountTaka?: string;
  expenseDate?: string;
}

function emptyForm(): FormState {
  return {
    category: 'MISC',
    amountTaka: '',
    expenseDate: todayIso(),
    paymentMethod: 'CASH',
    payee: '',
    reference: '',
    note: '',
  };
}

function formFromExpense(expense: Expense): FormState {
  return {
    category: expense.category,
    amountTaka: minorToTakaInput(expense.amountMinor),
    expenseDate: expense.expenseDate,
    paymentMethod: expense.paymentMethod,
    payee: expense.payee ?? '',
    reference: expense.reference ?? '',
    note: expense.note ?? '',
  };
}

export function ExpenseFormModal({
  open,
  expense,
  onClose,
  onSaved,
}: ExpenseFormModalProps): JSX.Element {
  const isEdit = Boolean(expense);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();

  useEffect(() => {
    if (!open) return;
    setForm(expense ? formFromExpense(expense) : emptyForm());
    setErrors({});
    setFormError(null);
  }, [open, expense]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const nextErrors: FormErrors = {};

    const amountMinor = parseTakaToMinor(form.amountTaka);
    if (amountMinor === null || amountMinor <= 0) {
      nextErrors.amountTaka = 'Enter an amount greater than 0';
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.expenseDate)) {
      nextErrors.expenseDate = 'Enter a valid date';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payee = form.payee.trim();
    const reference = form.reference.trim();
    const note = form.note.trim();

    try {
      if (isEdit && expense) {
        const updated = await updateMutation.mutateAsync({
          id: expense.id,
          payload: {
            category: form.category,
            amountMinor: amountMinor as number,
            expenseDate: form.expenseDate,
            paymentMethod: form.paymentMethod,
            ...(payee ? { payee } : {}),
            ...(reference ? { reference } : {}),
            ...(note ? { note } : {}),
          },
        });
        onSaved?.(updated.id);
      } else {
        const created = await createMutation.mutateAsync({
          category: form.category,
          amountMinor: amountMinor as number,
          expenseDate: form.expenseDate,
          paymentMethod: form.paymentMethod,
          ...(payee ? { payee } : {}),
          ...(reference ? { reference } : {}),
          ...(note ? { note } : {}),
        });
        onSaved?.(created.id);
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Unable to save expense. Please try again.');
      }
    }
  };

  const submitting = isEdit ? updateMutation.isPending : createMutation.isPending;

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit expense' : 'New expense'}
      onClose={onClose}
      size="lg"
      closeOnOverlayClick={!submitting}
    >
      <form onSubmit={handleSubmit} className="expense-form" noValidate>
        <div className="expense-form__grid">
          <Select
            label="Category"
            options={CATEGORY_OPTIONS}
            value={form.category}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                category: e.target.value as ExpenseCategory,
              }))
            }
            disabled={submitting}
          />

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
            label="Date"
            type="date"
            value={form.expenseDate}
            onChange={(e) => setForm((s) => ({ ...s, expenseDate: e.target.value }))}
            {...(errors.expenseDate ? { error: errors.expenseDate } : {})}
            disabled={submitting}
          />

          <Select
            label="Payment method"
            options={METHOD_OPTIONS}
            value={form.paymentMethod}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                paymentMethod: e.target.value as ExpensePaymentMethod,
              }))
            }
            disabled={submitting}
          />

          <Input
            label="Payee (optional)"
            value={form.payee}
            onChange={(e) => setForm((s) => ({ ...s, payee: e.target.value }))}
            disabled={submitting}
            placeholder="e.g. DESCO, Landlord"
          />

          <Input
            label="Reference (optional)"
            value={form.reference}
            onChange={(e) => setForm((s) => ({ ...s, reference: e.target.value }))}
            disabled={submitting}
            placeholder="e.g. Bill #12345"
          />
        </div>

        <Textarea
          label="Note (optional)"
          value={form.note}
          onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
          disabled={submitting}
        />

        {formError && (
          <div className="expense-form__error" role="alert">
            {formError}
          </div>
        )}

        <div className="expense-form__actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? 'Save changes' : 'Create expense'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
