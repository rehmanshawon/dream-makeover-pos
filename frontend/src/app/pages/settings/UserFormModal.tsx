import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { ApiError } from '../../../api/api-error';
import { useCreateUser, useUpdateUser } from '../../../api/user-hooks';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Modal } from '../../../ui/Modal';
import { Select, type SelectOption } from '../../../ui/Select';
import type { UserRole } from '../../../types/auth';
import type { User } from '../../../types/users';
import './UserFormModal.css';

const ROLE_OPTIONS: SelectOption[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'STAFF', label: 'Staff' },
];

interface UserFormModalProps {
  open: boolean;
  user?: User;
  onClose: () => void;
}

interface FormState {
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
}

interface FormErrors {
  username?: string;
  password?: string;
  displayName?: string;
}

function emptyForm(): FormState {
  return {
    username: '',
    password: '',
    displayName: '',
    role: 'STAFF',
  };
}

function formFromUser(user: User): FormState {
  return {
    username: user.username,
    password: '',
    displayName: user.displayName,
    role: user.role,
  };
}

export function UserFormModal({ open, user, onClose }: UserFormModalProps): JSX.Element {
  const isEdit = Boolean(user);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  useEffect(() => {
    if (!open) return;
    setForm(user ? formFromUser(user) : emptyForm());
    setErrors({});
    setFormError(null);
  }, [open, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const nextErrors: FormErrors = {};

    if (!isEdit) {
      const trimmedUsername = form.username.trim();
      if (trimmedUsername.length < 3) {
        nextErrors.username = 'Username must be at least 3 characters';
      } else if (!/^[a-zA-Z0-9_.-]+$/.test(trimmedUsername)) {
        nextErrors.username =
          'Username may contain letters, numbers, underscores, dots, and hyphens';
      }

      if (form.password.length < 8) {
        nextErrors.password = 'Password must be at least 8 characters';
      }
    }

    const trimmedDisplayName = form.displayName.trim();
    if (trimmedDisplayName.length < 2) {
      nextErrors.displayName = 'Display name must be at least 2 characters';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      if (isEdit && user) {
        await updateMutation.mutateAsync({
          id: user.id,
          payload: {
            displayName: trimmedDisplayName,
            role: form.role,
          },
        });
      } else {
        await createMutation.mutateAsync({
          username: form.username.trim(),
          password: form.password,
          displayName: trimmedDisplayName,
          role: form.role,
        });
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Unable to save user. Please try again.');
      }
    }
  };

  const submitting = isEdit ? updateMutation.isPending : createMutation.isPending;

  return (
    <Modal
      open={open}
      title={isEdit ? `Edit user — ${user?.username}` : 'New user'}
      onClose={onClose}
      size="md"
      closeOnOverlayClick={!submitting}
    >
      <form onSubmit={handleSubmit} className="user-form" noValidate>
        {!isEdit && (
          <Input
            label="Username"
            autoFocus
            autoComplete="off"
            value={form.username}
            onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
            {...(errors.username ? { error: errors.username } : {})}
            disabled={submitting}
          />
        )}

        {!isEdit && (
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
            {...(errors.password ? { error: errors.password } : {})}
            hint="At least 8 characters"
            disabled={submitting}
          />
        )}

        <Input
          label="Display name"
          autoFocus={isEdit}
          value={form.displayName}
          onChange={(e) => setForm((s) => ({ ...s, displayName: e.target.value }))}
          {...(errors.displayName ? { error: errors.displayName } : {})}
          disabled={submitting}
        />

        <Select
          label="Role"
          options={ROLE_OPTIONS}
          value={form.role}
          onChange={(e) => setForm((s) => ({ ...s, role: e.target.value as UserRole }))}
          hint="Staff cannot access financial data or settings."
          disabled={submitting}
        />

        {formError && (
          <div className="user-form__error" role="alert">
            {formError}
          </div>
        )}

        <div className="user-form__actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? 'Save changes' : 'Create user'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
