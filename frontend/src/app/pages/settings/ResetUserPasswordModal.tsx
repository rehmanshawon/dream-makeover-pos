import { useEffect, useState, type FormEvent, type JSX } from 'react';
import { ApiError } from '../../../api/api-error';
import { useResetUserPassword } from '../../../api/user-hooks';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Modal } from '../../../ui/Modal';
import type { User } from '../../../types/users';

interface ResetUserPasswordModalProps {
  user: User | null;
  onClose: () => void;
}

export function ResetUserPasswordModal({
  user,
  onClose,
}: ResetUserPasswordModalProps): JSX.Element {
  const { reset, mutateAsync, isPending } = useResetUserPassword();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      reset();
    }
  }, [user, reset]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!user) return;

    try {
      await mutateAsync({
        id: user.id,
        payload: { newPassword },
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reset this password.');
    }
  };

  const submitting = isPending;

  return (
    <Modal
      open={user !== null}
      title={user ? `Reset password — ${user.username}` : 'Reset password'}
      onClose={onClose}
      size="sm"
      closeOnOverlayClick={!submitting}
    >
      <form className="user-form" onSubmit={handleSubmit} noValidate>
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          autoFocus
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          hint="At least 8 characters"
          disabled={submitting}
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={submitting}
        />
        {error && (
          <div className="user-form__error" role="alert">
            {error}
          </div>
        )}
        <div className="user-form__actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Reset password
          </Button>
        </div>
      </form>
    </Modal>
  );
}