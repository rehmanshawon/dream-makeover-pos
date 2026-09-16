import type { JSX } from 'react';
import { Button } from '../Button';
import { Modal } from '../Modal';
import './ConfirmDialog.css';

export type ConfirmVariant = 'primary' | 'danger';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A small modal for irreversible or destructive confirmations.
 *
 * Used for actions like deletes where a single accidental click would
 * cause harm. The caller owns the state and decides what action to
 * perform on confirm.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): JSX.Element {
  return (
    <Modal open={open} title={title} onClose={onCancel} size="sm" closeOnOverlayClick={!loading}>
      <div className="confirm-dialog">
        <p className="confirm-dialog__message">{message}</p>
        <div className="confirm-dialog__actions">
          <Button variant="secondary" onClick={onCancel} disabled={loading} type="button">
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
            type="button"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
