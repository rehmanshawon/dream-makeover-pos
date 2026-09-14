import type { JSX } from 'react';
import { formatBdt } from '../../../utils/format';
import { Button } from '../../../ui/Button';
import type { CartItem } from './use-cart';
import './CartRow.css';

interface CartRowProps {
  item: CartItem;
  onChangeQuantity: (quantity: number) => void;
  onRemove: () => void;
}

export function CartRow({ item, onChangeQuantity, onRemove }: CartRowProps): JSX.Element {
  const lineTotal = item.unitPriceMinor * item.quantity;

  return (
    <div className="cart-row">
      <div className="cart-row__main">
        <div className="cart-row__name">{item.name}</div>
        <div className="cart-row__unit">{formatBdt(item.unitPriceMinor)} each</div>
      </div>

      <div className="cart-row__controls">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onChangeQuantity(item.quantity - 1)}
          aria-label={`Decrease quantity of ${item.name}`}
        >
          −
        </Button>
        <input
          type="number"
          className="cart-row__quantity"
          value={item.quantity}
          min={1}
          onChange={(e) => {
            const value = Number(e.target.value);
            if (Number.isInteger(value) && value >= 1) {
              onChangeQuantity(value);
            }
          }}
          aria-label={`Quantity of ${item.name}`}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onChangeQuantity(item.quantity + 1)}
          aria-label={`Increase quantity of ${item.name}`}
        >
          +
        </Button>
      </div>

      <div className="cart-row__total">{formatBdt(lineTotal)}</div>

      <Button
        size="sm"
        variant="ghost"
        onClick={onRemove}
        aria-label={`Remove ${item.name}`}
        className="cart-row__remove"
      >
        ×
      </Button>
    </div>
  );
}
