import { useEffect, useMemo, useState, type FormEvent, type JSX } from 'react';
import { ApiError } from '../../../api/api-error';
import { useCategories, useCreateCategory, useUpdateCategory } from '../../../api/category-hooks';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Modal } from '../../../ui/Modal';
import { Select, type SelectOption } from '../../../ui/Select';
import type { Category, CategoryKind } from '../../../types/categories';
import './CategoryFormModal.css';

const KIND_OPTIONS: SelectOption[] = [
  { value: 'PRODUCT', label: 'Product' },
  { value: 'SERVICE', label: 'Service' },
];

interface CategoryFormModalProps {
  open: boolean;
  category?: Category;
  defaultKind?: CategoryKind;
  onClose: () => void;
}

interface FormState {
  name: string;
  kind: CategoryKind;
  parentId: string;
  displayOrder: string;
}

interface FormErrors {
  name?: string;
  displayOrder?: string;
}

function emptyForm(defaultKind: CategoryKind): FormState {
  return {
    name: '',
    kind: defaultKind,
    parentId: '',
    displayOrder: '0',
  };
}

function formFromCategory(category: Category): FormState {
  return {
    name: category.name,
    kind: category.kind,
    parentId: category.parentId ?? '',
    displayOrder: String(category.displayOrder),
  };
}

export function CategoryFormModal({
  open,
  category,
  defaultKind = 'PRODUCT',
  onClose,
}: CategoryFormModalProps): JSX.Element {
  const isEdit = Boolean(category);

  const [form, setForm] = useState<FormState>(() => emptyForm(defaultKind));
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();

  // Fetch sibling categories for the parent picker.
  const { data: existing } = useCategories(form.kind);

  useEffect(() => {
    if (!open) return;
    setForm(category ? formFromCategory(category) : emptyForm(defaultKind));
    setErrors({});
    setFormError(null);
  }, [open, category, defaultKind]);

  const parentOptions: SelectOption[] = useMemo(() => {
    const list: SelectOption[] = [{ value: '', label: '— None (top level) —' }];
    if (!existing) return list;
    for (const c of existing) {
      // Cannot select self as parent, and cannot select descendants
      // of self (would create a cycle). We avoid descendants by
      // excluding categories whose parentId chain includes self, but
      // since the tree is small, we simply exclude self.
      if (category && c.id === category.id) continue;
      list.push({ value: c.id, label: c.name });
    }
    return list;
  }, [existing, category]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const nextErrors: FormErrors = {};

    const trimmedName = form.name.trim();
    if (trimmedName.length < 2) {
      nextErrors.name = 'Name must be at least 2 characters';
    }

    const displayOrder = Number(form.displayOrder);
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      nextErrors.displayOrder = 'Display order must be a non-negative integer';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      if (isEdit && category) {
        await updateMutation.mutateAsync({
          id: category.id,
          payload: {
            name: trimmedName,
            displayOrder,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: trimmedName,
          kind: form.kind,
          displayOrder,
          ...(form.parentId ? { parentId: form.parentId } : {}),
          active: true,
        });
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Unable to save category. Please try again.');
      }
    }
  };

  const submitting = isEdit ? updateMutation.isPending : createMutation.isPending;

  return (
    <Modal
      open={open}
      title={isEdit ? `Edit — ${category?.name}` : 'New category'}
      onClose={onClose}
      size="md"
      closeOnOverlayClick={!submitting}
    >
      <form onSubmit={handleSubmit} className="category-form" noValidate>
        <Input
          label="Name"
          autoFocus
          value={form.name}
          onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          {...(errors.name ? { error: errors.name } : {})}
          disabled={submitting}
          placeholder="e.g. Bridal Service"
        />

        <Select
          label="Kind"
          options={KIND_OPTIONS}
          value={form.kind}
          onChange={(e) =>
            setForm((s) => ({
              ...s,
              kind: e.target.value as CategoryKind,
              parentId: '',
            }))
          }
          hint={
            isEdit
              ? 'Kind cannot be changed after creation.'
              : 'Product categories hold products. Service categories hold services.'
          }
          disabled={submitting || isEdit}
        />

        {!isEdit && (
          <Select
            label="Parent category"
            options={parentOptions}
            value={form.parentId}
            onChange={(e) => setForm((s) => ({ ...s, parentId: e.target.value }))}
            hint="Leave empty to create a top-level category."
            disabled={submitting}
          />
        )}

        <Input
          label="Display order"
          inputMode="numeric"
          value={form.displayOrder}
          onChange={(e) => setForm((s) => ({ ...s, displayOrder: e.target.value }))}
          {...(errors.displayOrder ? { error: errors.displayOrder } : {})}
          hint="Lower numbers appear first."
          disabled={submitting}
        />

        {formError && (
          <div className="category-form__error" role="alert">
            {formError}
          </div>
        )}

        <div className="category-form__actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? 'Save changes' : 'Create category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
