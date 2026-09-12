import { forwardRef, useId, type JSX, type SelectHTMLAttributes } from 'react';
import './Select.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, id, options, placeholder, className, children, ...rest },
  ref,
): JSX.Element {
  const generatedId = useId();
  const selectId = id ?? `select-${generatedId}`;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const classes = [
    'select-field__control',
    error ? 'select-field__control--error' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="select-field">
      {label && (
        <label htmlFor={selectId} className="select-field__label">
          {label}
        </label>
      )}
      <select
        {...rest}
        ref={ref}
        id={selectId}
        className={classes}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
      {hint && !error && (
        <p id={hintId} className="select-field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="select-field__error">
          {error}
        </p>
      )}
    </div>
  );
});
