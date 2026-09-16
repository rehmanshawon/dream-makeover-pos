import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { ApiError } from '../../../api/api-error';
import { authPasswordApi } from '../../../api/auth-password';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Modal } from '../../../ui/Modal';
import './ChangePasswordModal.css';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

const EMPTY: FormState = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export function ChangePasswordModal({
  open,
  onClose,
  onSuccess,
}: ChangePasswordModalProps): JSX.Element {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY);
    setErrors({});
    setFormError(null);
    setSubmitting(false);
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const nextErrors: FormErrors = {};

    if (!form.currentPassword) {
      nextErrors.currentPassword = 'Enter your current password';
    }

    if (form.newPassword.length < 8) {
      nextErrors.newPassword = 'New password must be at least 8 characters';
    } else if (form.newPassword === form.currentPassword) {
      nextErrors.newPassword = 'New password must be different from the current one';
    }

    if (form.newPassword !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      await authPasswordApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Unable to change password. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Change password"
      onClose={onClose}
      size="sm"
      closeOnOverlayClick={!submitting}
    >
      <form onSubmit={handleSubmit} className="change-password-form" noValidate>
        <Input
          label="Current password"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={form.currentPassword}
          onChange={(e) => setForm((s) => ({ ...s, currentPassword: e.target.value }))}
          {...(errors.currentPassword ? { error: errors.currentPassword } : {})}
          disabled={submitting}
        />

        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={(e) => setForm((s) => ({ ...s, newPassword: e.target.value }))}
          {...(errors.newPassword ? { error: errors.newPassword } : {})}
          hint="At least 8 characters"
          disabled={submitting}
        />

        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(e) => setForm((s) => ({ ...s, confirmPassword: e.target.value }))}
          {...(errors.confirmPassword ? { error: errors.confirmPassword } : {})}
          disabled={submitting}
        />

        {formError && (
          <div className="change-password-form__error" role="alert">
            {formError}
          </div>
        )}

        <div className="change-password-form__actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Change password
          </Button>
        </div>
      </form>
    </Modal>
  );
}
