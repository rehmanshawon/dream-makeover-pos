import { useEffect, useMemo, useState, type FormEvent, type JSX } from 'react';
import { ApiError } from '../../../api/api-error';
import { useCreatePackage, useUpdatePackage } from '../../../api/package-hooks';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Modal } from '../../../ui/Modal';
import { Textarea } from '../../../ui/Textarea';
import { formatBdt, minorToTakaInput, parseTakaToMinor } from '../../../utils/format';
import type { Package, PackageItemKind } from '../../../types/packages';
import { PackageItemPickerModal, type PickedComponent } from './PackageItemPickerModal';
import './PackageFormModal.css';

interface PackageFormModalProps {
  open: boolean;
  package?: Package;
  onClose: () => void;
  onSaved?: (packageId: string) => void;
}

interface FormState {
  name: string;
  description: string;
  packagePriceTaka: string;
}

interface FormErrors {
  name?: string;
  packagePriceTaka?: string;
  components?: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  packagePriceTaka: '',
};

function componentKey(itemKind: PackageItemKind, itemId: string): string {
  return `${itemKind}:${itemId}`;
}

export function PackageFormModal({
  open,
  package: existingPackage,
  onClose,
  onSaved,
}: PackageFormModalProps): JSX.Element {
  const isEdit = Boolean(existingPackage);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [components, setComponents] = useState<PickedComponent[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const createMutation = useCreatePackage();
  const updateMutation = useUpdatePackage();

  useEffect(() => {
    if (!open) return;

    if (existingPackage) {
      setForm({
        name: existingPackage.name,
        description: existingPackage.description ?? '',
        packagePriceTaka: minorToTakaInput(existingPackage.packagePriceMinor),
      });
      setComponents(
        existingPackage.items.map((item) => ({
          itemKind: item.itemKind,
          itemId: item.itemId,
          itemName: item.itemName,
          snapshotPriceMinor: item.snapshotPriceMinor,
        })),
      );
    } else {
      setForm(EMPTY_FORM);
      setComponents([]);
    }
    setErrors({});
    setFormError(null);
    setPickerOpen(false);
  }, [open, existingPackage]);

  const selectedKeys = useMemo(
    () => new Set(components.map((c) => componentKey(c.itemKind, c.itemId))),
    [components],
  );

  const normalPriceMinor = useMemo(
    () => components.reduce((sum, c) => sum + c.snapshotPriceMinor, 0),
    [components],
  );

  const packagePriceMinor = parseTakaToMinor(form.packagePriceTaka);
  const estimatedSavings =
    packagePriceMinor !== null && packagePriceMinor >= 0 && packagePriceMinor <= normalPriceMinor
      ? normalPriceMinor - packagePriceMinor
      : null;

  const handleAddComponent = (item: PickedComponent): void => {
    setComponents((prev) => {
      const key = componentKey(item.itemKind, item.itemId);
      if (prev.some((c) => componentKey(c.itemKind, c.itemId) === key)) {
        return prev;
      }
      return [...prev, item];
    });
  };

  const handleRemoveComponent = (kind: PackageItemKind, id: string): void => {
    setComponents((prev) => prev.filter((c) => !(c.itemKind === kind && c.itemId === id)));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const nextErrors: FormErrors = {};

    const trimmedName = form.name.trim();
    if (trimmedName.length < 2) {
      nextErrors.name = 'Name must be at least 2 characters';
    }

    if (components.length === 0) {
      nextErrors.components = 'Add at least one component';
    }

    const price = parseTakaToMinor(form.packagePriceTaka);
    if (price === null || price <= 0) {
      nextErrors.packagePriceTaka = 'Enter a package price greater than 0';
    } else if (price > normalPriceMinor) {
      nextErrors.packagePriceTaka = 'Package price cannot exceed the combined component price';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const itemPayload = components.map((c) => ({
      itemKind: c.itemKind,
      itemId: c.itemId,
    }));

    try {
      if (isEdit && existingPackage) {
        const updated = await updateMutation.mutateAsync({
          id: existingPackage.id,
          payload: {
            name: trimmedName,
            ...(form.description.trim() ? { description: form.description.trim() } : {}),
            packagePriceMinor: price as number,
            items: itemPayload,
          },
        });
        onSaved?.(updated.id);
      } else {
        const created = await createMutation.mutateAsync({
          name: trimmedName,
          ...(form.description.trim() ? { description: form.description.trim() } : {}),
          packagePriceMinor: price as number,
          items: itemPayload,
          active: true,
        });
        onSaved?.(created.id);
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Unable to save package. Please try again.');
      }
    }
  };

  const submitting = isEdit ? updateMutation.isPending : createMutation.isPending;

  return (
    <>
      <Modal
        open={open}
        title={isEdit ? 'Edit package' : 'New package'}
        onClose={onClose}
        size="lg"
        closeOnOverlayClick={!submitting}
      >
        <form onSubmit={handleSubmit} className="package-form" noValidate>
          <Input
            label="Package name"
            autoFocus
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            {...(errors.name ? { error: errors.name } : {})}
            disabled={submitting}
            placeholder="e.g. Bridal Package"
          />

          <Textarea
            label="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            disabled={submitting}
          />

          <div className="package-form__components">
            <div className="package-form__components-header">
              <span className="package-form__components-title">Components</span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setPickerOpen(true)}
                disabled={submitting}
              >
                Add component
              </Button>
            </div>

            {components.length === 0 ? (
              <p className="package-form__components-empty">
                No components added yet. Click "Add component" to begin.
              </p>
            ) : (
              <ul className="package-form__components-list">
                {components.map((c) => (
                  <li key={componentKey(c.itemKind, c.itemId)} className="package-form__component">
                    <span className="package-form__component-main">
                      <span className="package-form__component-name">{c.itemName}</span>
                      <span className="package-form__component-kind">
                        {c.itemKind === 'SERVICE' ? 'Service' : 'Product'}
                      </span>
                    </span>
                    <span className="package-form__component-price">
                      {formatBdt(c.snapshotPriceMinor)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveComponent(c.itemKind, c.itemId)}
                      disabled={submitting}
                      aria-label={`Remove ${c.itemName}`}
                    >
                      ×
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {errors.components && <p className="package-form__field-error">{errors.components}</p>}
          </div>

          <div className="package-form__pricing">
            <div className="package-form__pricing-row">
              <span className="package-form__pricing-label">Combined component price</span>
              <span className="package-form__pricing-value">{formatBdt(normalPriceMinor)}</span>
            </div>

            <Input
              label="Package price (৳)"
              inputMode="decimal"
              value={form.packagePriceTaka}
              onChange={(e) => setForm((s) => ({ ...s, packagePriceTaka: e.target.value }))}
              {...(errors.packagePriceTaka ? { error: errors.packagePriceTaka } : {})}
              disabled={submitting}
            />

            {estimatedSavings !== null && (
              <div className="package-form__pricing-row package-form__pricing-row--savings">
                <span className="package-form__pricing-label">Estimated savings</span>
                <span className="package-form__pricing-value">{formatBdt(estimatedSavings)}</span>
              </div>
            )}
          </div>

          {formError && (
            <div className="package-form__error" role="alert">
              {formError}
            </div>
          )}

          <div className="package-form__actions">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? 'Save changes' : 'Create package'}
            </Button>
          </div>
        </form>
      </Modal>

      <PackageItemPickerModal
        open={pickerOpen}
        selectedKeys={selectedKeys}
        onAdd={handleAddComponent}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}
