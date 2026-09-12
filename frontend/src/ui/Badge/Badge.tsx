import type { JSX, ReactNode } from 'react';
import './Badge.css';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
}

export function Badge({ variant = 'neutral', children }: BadgeProps): JSX.Element {
  return <span className={`badge badge--${variant}`}>{children}</span>;
}
