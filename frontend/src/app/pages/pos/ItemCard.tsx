import type { JSX } from 'react';
import { formatBdt } from '../../../utils/format';
import './ItemCard.css';

interface ItemCardProps {
  name: string;
  priceMinor: number;
  disabled?: boolean;
  disabledReason?: string;
  subtitle?: string;
  onClick: () => void;
}

export function ItemCard({
  name,
  priceMinor,
  disabled,
  disabledReason,
  subtitle,
  onClick,
}: ItemCardProps): JSX.Element {
  return (
    <button
      type="button"
      className={`item-card${disabled ? ' item-card--disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
    >
      <span className="item-card__name">{name}</span>
      {subtitle && <span className="item-card__subtitle">{subtitle}</span>}
      <span className="item-card__price">{formatBdt(priceMinor)}</span>
      {disabled && disabledReason && <span className="item-card__badge">{disabledReason}</span>}
    </button>
  );
}
