import { forwardRef, useId, type JSX, type TextareaHTMLAttributes } from 'react';
import './Textarea.css';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, id, className, ...rest },
  ref,
): JSX.Element {
  const generatedId = useId();
  const areaId = id ?? `textarea-${generatedId}`;
  const hintId = hint ? `${areaId}-hint` : undefined;
  const errorId = error ? `${areaId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const classes = [
    'textarea-field__control',
    error ? 'textarea-field__control--error' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="textarea-field">
      {label && (
        <label htmlFor={areaId} className="textarea-field__label">
          {label}
        </label>
      )}
      <textarea
        {...rest}
        ref={ref}
        id={areaId}
        className={classes}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {hint && !error && (
        <p id={hintId} className="textarea-field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="textarea-field__error">
          {error}
        </p>
      )}
    </div>
  );
});
