import type { JSX } from 'react';
import './Spinner.css';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function Spinner({ size = 'md', label = 'Loading' }: SpinnerProps): JSX.Element {
  return (
    <div className={`spinner spinner--${size}`} role="status" aria-label={label}>
      <span className="spinner__ring" aria-hidden="true" />
    </div>
  );
}
