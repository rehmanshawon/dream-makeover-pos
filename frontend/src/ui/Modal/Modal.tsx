import { useEffect, useRef, type JSX, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeOnOverlayClick?: boolean;
}

/**
 * Accessible modal dialog.
 *
 * Behaviors:
 * - Renders into document.body via a portal
 * - Closes on Escape
 * - Closes on overlay click unless disabled
 * - Moves focus into the dialog on open
 * - Restores focus to the previously focused element on close
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
}: ModalProps): JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    firstFocusable?.focus();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleOverlayClick = (): void => {
    if (closeOnOverlayClick) onClose();
  };

  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleOverlayClick();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`modal modal--${size}`}
      >
        <header className="modal__header">
          <h2 id="modal-title" className="modal__title">
            {title}
          </h2>
          <button
            type="button"
            className="modal__close"
            aria-label="Close dialog"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
