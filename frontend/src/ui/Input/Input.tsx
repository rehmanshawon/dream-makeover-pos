import { forwardRef, useId, type InputHTMLAttributes, type JSX } from 'react';
import './Input.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, id, className, ...rest },
  ref,
): JSX.Element {
  const generatedId = useId();
  const inputId = id ?? `input-${generatedId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const classes = ['input-field__control', error ? 'input-field__control--error' : null, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="input-field">
      {label && (
        <label htmlFor={inputId} className="input-field__label">
          {label}
        </label>
      )}
      <input
        {...rest}
        ref={ref}
        id={inputId}
        className={classes}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {hint && !error && (
        <p id={hintId} className="input-field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="input-field__error">
          {error}
        </p>
      )}
    </div>
  );
});
