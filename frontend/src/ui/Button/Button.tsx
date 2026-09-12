import { forwardRef, type ButtonHTMLAttributes, type JSX } from 'react';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

/**
 * Primary action element.
 *
 * Defaults to `type="button"` to prevent accidental form submission.
 * Pass `type="submit"` explicitly when used inside a form.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    className,
    disabled,
    children,
    type = 'button',
    ...rest
  },
  ref,
): JSX.Element {
  const classes = [
    'button',
    `button--${variant}`,
    `button--size-${size}`,
    fullWidth ? 'button--full' : null,
    loading ? 'button--loading' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <span className="button__spinner" aria-hidden="true" />}
      <span className="button__content">{children}</span>
    </button>
  );
});
