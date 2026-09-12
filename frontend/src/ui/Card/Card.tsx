import type { HTMLAttributes, JSX, ReactNode } from 'react';
import './Card.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  footer?: ReactNode;
}

export function Card({
  title,
  subtitle,
  actions,
  footer,
  className,
  children,
  ...rest
}: CardProps): JSX.Element {
  const classes = ['card', className].filter(Boolean).join(' ');
  const hasHeader = Boolean(title || subtitle || actions);

  return (
    <div {...rest} className={classes}>
      {hasHeader && (
        <div className="card__header">
          <div className="card__header-text">
            {title && <h3 className="card__title">{title}</h3>}
            {subtitle && <p className="card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card__actions">{actions}</div>}
        </div>
      )}
      <div className="card__body">{children}</div>
      {footer && <div className="card__footer">{footer}</div>}
    </div>
  );
}
