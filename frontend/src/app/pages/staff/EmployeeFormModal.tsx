import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { ApiError } from '../../../api/api-error';
import {
  useCreateEmployee,
  useUpdateEmployee,
  useUploadEmployeePhoto,
} from '../../../api/employee-hooks';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Modal } from '../../../ui/Modal';
import { Select, type SelectOption } from '../../../ui/Select';
import { Textarea } from '../../../ui/Textarea';
import { minorToTakaInput, parseTakaToMinor, todayIso } from '../../../utils/format';
import type { Employee, SalaryFrequency } from '../../../types/employees';
import './EmployeeFormModal.css';

const FREQUENCY_OPTIONS: SelectOption[] = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'DAILY', label: 'Daily' },
];

interface EmployeeFormModalProps {
  open: boolean;
  employee?: Employee;
  onClose: () => void;
  onSaved?: (employeeId: string) => void;
}

interface FormState {
  fullName: string;
  role: string;
  phone: string;
  nidOrBirthCertificate: string;
  presentAddress: string;
  permanentAddress: string;
  joinDate: string;
  salaryTaka: string;
  salaryFrequency: SalaryFrequency;
  note: string;
  photo: File | null;
}

interface FormErrors {
  fullName?: string;
  role?: string;
  joinDate?: string;
  salaryTaka?: string;
}

function emptyForm(): FormState {
  return {
    fullName: '',
    role: '',
    phone: '',
    nidOrBirthCertificate: '',
    presentAddress: '',
    permanentAddress: '',
    joinDate: todayIso(),
    salaryTaka: '',
    salaryFrequency: 'MONTHLY',
    note: '',
    photo: null,
  };
}

function formFromEmployee(employee: Employee): FormState {
  return {
    fullName: employee.fullName,
    role: employee.role,
    phone: employee.phone ?? '',
    nidOrBirthCertificate: employee.nidOrBirthCertificate ?? '',
    presentAddress: employee.presentAddress ?? '',
    permanentAddress: employee.permanentAddress ?? '',
    joinDate: employee.joinDate,
    salaryTaka: minorToTakaInput(employee.salaryMinor),
    salaryFrequency: employee.salaryFrequency,
    note: employee.note ?? '',
    photo: null,
  };
}

export function EmployeeFormModal({
  open,
  employee,
  onClose,
  onSaved,
}: EmployeeFormModalProps): JSX.Element {
  const isEdit = Boolean(employee);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const photoMutation = useUploadEmployeePhoto();

  useEffect(() => {
    if (!open) return;
    setForm(employee ? formFromEmployee(employee) : emptyForm());
    setErrors({});
    setFormError(null);
  }, [open, employee]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const nextErrors: FormErrors = {};

    const trimmedName = form.fullName.trim();
    if (trimmedName.length < 2) {
      nextErrors.fullName = 'Name must be at least 2 characters';
    }

    const trimmedRole = form.role.trim();
    if (trimmedRole.length < 2) {
      nextErrors.role = 'Role must be at least 2 characters';
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.joinDate)) {
      nextErrors.joinDate = 'Enter a valid date';
    }

    const salaryMinor = parseTakaToMinor(form.salaryTaka);
    if (salaryMinor === null || salaryMinor <= 0) {
      nextErrors.salaryTaka = 'Enter a salary greater than 0';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const note = form.note.trim();
    const phone = form.phone.trim();
    const nidOrBirthCertificate = form.nidOrBirthCertificate.trim();
    const presentAddress = form.presentAddress.trim();
    const permanentAddress = form.permanentAddress.trim();

    try {
      if (isEdit && employee) {
        const updated = await updateMutation.mutateAsync({
          id: employee.id,
          payload: {
            fullName: trimmedName,
            role: trimmedRole,
            phone,
            nidOrBirthCertificate,
            presentAddress,
            permanentAddress,
            salaryMinor: salaryMinor as number,
            salaryFrequency: form.salaryFrequency,
            note,
          },
        });
        if (form.photo) {
          await photoMutation.mutateAsync({ id: updated.id, photo: form.photo });
        }
        onSaved?.(updated.id);
      } else {
        const created = await createMutation.mutateAsync({
          fullName: trimmedName,
          role: trimmedRole,
          ...(phone ? { phone } : {}),
          nidOrBirthCertificate,
          presentAddress,
          permanentAddress,
          joinDate: form.joinDate,
          salaryMinor: salaryMinor as number,
          salaryFrequency: form.salaryFrequency,
          ...(note ? { note } : {}),
          status: 'ACTIVE',
        });
        if (form.photo) {
          await photoMutation.mutateAsync({ id: created.id, photo: form.photo });
        }
        onSaved?.(created.id);
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Unable to save employee. Please try again.');
      }
    }
  };

  const submitting =
    (isEdit ? updateMutation.isPending : createMutation.isPending) || photoMutation.isPending;

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit employee' : 'New employee'}
      onClose={onClose}
      size="lg"
      closeOnOverlayClick={!submitting}
    >
      <form onSubmit={handleSubmit} className="employee-form" noValidate>
        <div className="employee-form__grid">
          <Input
            label="Full name"
            autoFocus
            value={form.fullName}
            onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))}
            {...(errors.fullName ? { error: errors.fullName } : {})}
            disabled={submitting}
          />

          <Input
            label="Role"
            value={form.role}
            onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))}
            {...(errors.role ? { error: errors.role } : {})}
            disabled={submitting}
            placeholder="e.g. Senior Stylist"
          />

          <Input
            label="Phone (optional)"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
            disabled={submitting}
          />

          <Input
            label="NID / Birth certificate (optional)"
            value={form.nidOrBirthCertificate}
            onChange={(e) => setForm((s) => ({ ...s, nidOrBirthCertificate: e.target.value }))}
            disabled={submitting}
          />

          <Textarea
            label="Present address (optional)"
            value={form.presentAddress}
            onChange={(e) => setForm((s) => ({ ...s, presentAddress: e.target.value }))}
            disabled={submitting}
          />

          <Textarea
            label="Permanent address (optional)"
            value={form.permanentAddress}
            onChange={(e) => setForm((s) => ({ ...s, permanentAddress: e.target.value }))}
            disabled={submitting}
          />

          <Input
            label="Join date"
            type="date"
            value={form.joinDate}
            onChange={(e) => setForm((s) => ({ ...s, joinDate: e.target.value }))}
            {...(errors.joinDate ? { error: errors.joinDate } : {})}
            disabled={submitting || isEdit}
            {...(isEdit ? { hint: 'Join date cannot be changed' } : {})}
          />

          <Input
            label="Salary (৳)"
            inputMode="decimal"
            value={form.salaryTaka}
            onChange={(e) => setForm((s) => ({ ...s, salaryTaka: e.target.value }))}
            {...(errors.salaryTaka ? { error: errors.salaryTaka } : {})}
            disabled={submitting}
          />

          <Select
            label="Salary frequency"
            options={FREQUENCY_OPTIONS}
            value={form.salaryFrequency}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                salaryFrequency: e.target.value as SalaryFrequency,
              }))
            }
            disabled={submitting}
          />

          <div className="employee-form__photo-field">
            <label htmlFor="employee-photo" className="employee-form__photo-label">
              Photograph (optional)
            </label>
            <input
              id="employee-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setForm((s) => ({ ...s, photo: e.target.files?.[0] ?? null }))}
              disabled={submitting}
            />
            <span className="employee-form__photo-hint">JPEG, PNG, or WebP up to 5 MB</span>
          </div>
        </div>

        <Textarea
          label="Notes (optional)"
          value={form.note}
          onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
          disabled={submitting}
        />

        {formError && (
          <div className="employee-form__error" role="alert">
            {formError}
          </div>
        )}

        <div className="employee-form__actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? 'Save changes' : 'Create employee'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
