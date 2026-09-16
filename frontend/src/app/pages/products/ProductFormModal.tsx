import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Select } from '../../../ui/Select';
import { Modal } from '../../../ui/Modal';
import { ApiError } from '../../../api/api-error';
import { useCreateProduct } from '../../../api/product-hooks';
import { parseTakaToMinor } from '../../../utils/format';
import type { Product } from '../../../types/products';
import { useUpdateProduct } from '../../../api/product-hooks';
import { minorToTakaInput } from '../../../utils/format';

import './ProductFormModal.css';

const CATEGORY_OPTIONS = [
  { value: 'Cosmetics', label: 'Cosmetics' },
  { value: 'Saree', label: 'Saree' },
  { value: 'Three-piece', label: 'Three-piece' },
];

interface ProductFormModalProps {
  open: boolean;
  defaultCategory: string;
  product?: Product;
  onClose: () => void;
  onCreated?: (productId: string) => void;
}

interface FormState {
  name: string;
  category: string;
  stock: string;
  purchaseCostTaka: string;
  sellingPriceTaka: string;
  minimumStockThreshold: string;
}

function emptyForm(category: string): FormState {
  return {
    name: '',
    category,
    stock: '0',
    purchaseCostTaka: '0.00',
    sellingPriceTaka: '',
    minimumStockThreshold: '0',
  };
}

interface FormErrors {
  name?: string;
  stock?: string;
  purchaseCostTaka?: string;
  sellingPriceTaka?: string;
  minimumStockThreshold?: string;
}

export function ProductFormModal({
  open,
  defaultCategory,
  onClose,
  product,
  onCreated,
}: ProductFormModalProps): JSX.Element {
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultCategory));
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateProduct();

  const updateMutation = useUpdateProduct();
  const isEdit = Boolean(product);
  const submitting = isEdit ? updateMutation.isPending : createMutation.isPending;

  useEffect(() => {
    if (!open) return;

    if (product) {
      setForm({
        name: product.name,
        category: product.category,
        stock: String(product.stock),
        purchaseCostTaka: minorToTakaInput(product.purchaseCostMinor ?? 0),
        sellingPriceTaka: minorToTakaInput(product.sellingPriceMinor),
        minimumStockThreshold: String(product.minimumStockThreshold),
      });
    } else {
      setForm(emptyForm(defaultCategory));
    }
    setErrors({});
    setFormError(null);
  }, [open, defaultCategory, product]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const nextErrors: FormErrors = {};

    const trimmedName = form.name.trim();
    if (trimmedName.length < 2) {
      nextErrors.name = 'Name must be at least 2 characters';
    }

    const stock = Number(form.stock);
    if (!isEdit) {
      if (!Number.isInteger(stock) || stock < 0) {
        nextErrors.stock = 'Stock must be a non-negative integer';
      }
    }

    const purchaseCostMinor = parseTakaToMinor(form.purchaseCostTaka);
    if (purchaseCostMinor === null) {
      nextErrors.purchaseCostTaka = 'Enter a valid amount';
    }

    const sellingPriceMinor = parseTakaToMinor(form.sellingPriceTaka);
    if (sellingPriceMinor === null || sellingPriceMinor <= 0) {
      nextErrors.sellingPriceTaka = 'Enter a selling price greater than 0';
    }

    const minimumStockThreshold = Number(form.minimumStockThreshold);
    if (!Number.isInteger(minimumStockThreshold) || minimumStockThreshold < 0) {
      nextErrors.minimumStockThreshold = 'Enter a non-negative integer';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      if (isEdit && product) {
        const updated = await updateMutation.mutateAsync({
          id: product.id,
          payload: {
            name: trimmedName,
            category: form.category,
            purchaseCostMinor: purchaseCostMinor as number,
            sellingPriceMinor: sellingPriceMinor as number,
            minimumStockThreshold: minimumStockThreshold as number,
          },
        });
        onCreated?.(updated.id);
      } else {
        const created = await createMutation.mutateAsync({
          name: trimmedName,
          category: form.category,
          stock: stock as number,
          purchaseCostMinor: purchaseCostMinor as number,
          sellingPriceMinor: sellingPriceMinor as number,
          minimumStockThreshold: minimumStockThreshold as number,
        });
        onCreated?.(created.id);
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Unable to save product. Please try again.');
      }
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit product' : 'New product'}
      onClose={onClose}
      size="lg"
      closeOnOverlayClick={!submitting}
    >
      <form onSubmit={handleSubmit} className="product-form" noValidate>
        <div className="product-form__grid">
          <Input
            label="Name"
            autoFocus
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            {...(errors.name ? { error: errors.name } : {})}
            disabled={submitting}
          />

          <Select
            label="Category"
            options={CATEGORY_OPTIONS}
            value={form.category}
            onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
            disabled={submitting}
          />
          {!isEdit && (
            <Input
              label="Stock"
              inputMode="numeric"
              value={form.stock}
              onChange={(e) => setForm((s) => ({ ...s, stock: e.target.value }))}
              {...(errors.stock ? { error: errors.stock } : {})}
              disabled={submitting}
            />
          )}
          <Input
            label="Minimum stock threshold"
            inputMode="numeric"
            value={form.minimumStockThreshold}
            onChange={(e) => setForm((s) => ({ ...s, minimumStockThreshold: e.target.value }))}
            {...(errors.minimumStockThreshold ? { error: errors.minimumStockThreshold } : {})}
            disabled={submitting}
          />

          <Input
            label="Purchase cost (৳)"
            inputMode="decimal"
            value={form.purchaseCostTaka}
            onChange={(e) => setForm((s) => ({ ...s, purchaseCostTaka: e.target.value }))}
            {...(errors.purchaseCostTaka ? { error: errors.purchaseCostTaka } : {})}
            hint="What the shop pays per unit"
            disabled={submitting}
          />

          <Input
            label="Selling price (৳)"
            inputMode="decimal"
            value={form.sellingPriceTaka}
            onChange={(e) => setForm((s) => ({ ...s, sellingPriceTaka: e.target.value }))}
            {...(errors.sellingPriceTaka ? { error: errors.sellingPriceTaka } : {})}
            hint="What the customer pays per unit"
            disabled={submitting}
          />
        </div>

        {formError && (
          <div className="product-form__error" role="alert">
            {formError}
          </div>
        )}

        <div className="product-form__actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? 'Save changes' : 'Create product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
