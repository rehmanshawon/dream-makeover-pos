import { useState, type JSX } from 'react';
import { Button } from '../../../ui/Button';
import { Badge } from '../../../ui/Badge';
import { formatBdt, parseTakaToMinor, minorToTakaInput } from '../../../utils/format';
import { CartRow } from './CartRow';
import { CustomerPickerModal } from './CustomerPickerModal';
import type { CartItem, CartTotals } from './use-cart';
import './CartPanel.css';

interface CartPanelProps {
  items: CartItem[];
  totals: CartTotals;
  customerId: string | null;
  customerName: string | null;
  customerTier: string | null;
  onRemoveItem: (kind: CartItem['kind'], id: string) => void;
  onSetQuantity: (kind: CartItem['kind'], id: string, quantity: number) => void;
  onSelectCustomer: (id: string, name: string, tier: string) => void;
  onClearCustomer: () => void;
  onSetDiscount: (minorUnits: number) => void;
  onSetVatRate: (ratePercent: number) => void;
  onSetCashReceived: (minorUnits: number) => void;
  onClearCart: () => void;
  submissionError: string | null;
  submitting: boolean;
  onSubmit: () => void;
}

export function CartPanel({
  items,
  totals,
  customerId,
  customerName,
  customerTier,
  onRemoveItem,
  onSetQuantity,
  onSelectCustomer,
  onClearCustomer,
  onSetDiscount,
  onSetVatRate,
  onSetCashReceived,
  onClearCart,
  submissionError,
  submitting,
  onSubmit,
}: CartPanelProps): JSX.Element {
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [vatInput, setVatInput] = useState('');
  const [cashInput, setCashInput] = useState('');

  const canSubmit = items.length > 0 && totals.cashReceivedMinor >= totals.totalMinor;

  return (
    <aside className="cart-panel" aria-label="Cart">
      <header className="cart-panel__header">
        <h2 className="cart-panel__title">New Sale</h2>
        {items.length > 0 && (
          <Button size="sm" variant="ghost" onClick={onClearCart}>
            Clear
          </Button>
        )}
      </header>

      <section className="cart-panel__customer">
        {customerId ? (
          <div className="cart-panel__customer-info">
            <div>
              <div className="cart-panel__customer-name">{customerName}</div>
              {customerTier && <Badge variant="accent">{customerTier}</Badge>}
            </div>
            <div className="cart-panel__customer-actions">
              <Button size="sm" variant="ghost" onClick={() => setCustomerPickerOpen(true)}>
                Change
              </Button>
              <Button size="sm" variant="ghost" onClick={onClearCustomer}>
                Clear
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setCustomerPickerOpen(true)}>
            Add customer
          </Button>
        )}
      </section>

      <section className="cart-panel__items">
        {items.length === 0 ? (
          <div className="cart-panel__empty">No items yet. Click an item to add it.</div>
        ) : (
          items.map((item) => (
            <CartRow
              key={`${item.kind}:${item.id}`}
              item={item}
              onChangeQuantity={(q) => onSetQuantity(item.kind, item.id, q)}
              onRemove={() => onRemoveItem(item.kind, item.id)}
            />
          ))
        )}
      </section>

      <section className="cart-panel__summary">
        <div className="cart-panel__row">
          <span>Subtotal</span>
          <span>{formatBdt(totals.subtotalMinor)}</span>
        </div>

        <div className="cart-panel__row cart-panel__row--input">
          <label htmlFor="cart-discount">Discount (৳)</label>
          <input
            id="cart-discount"
            type="text"
            inputMode="decimal"
            className="cart-panel__input"
            value={discountInput}
            placeholder={minorToTakaInput(totals.discountMinor)}
            onChange={(e) => {
              setDiscountInput(e.target.value);
              const minor = parseTakaToMinor(e.target.value);
              onSetDiscount(minor ?? 0);
            }}
            onBlur={() => {
              // Reset input to reflect clamped discount after blur
              setDiscountInput('');
            }}
          />
        </div>

        <div className="cart-panel__row cart-panel__row--input">
          <label htmlFor="cart-vat">VAT (%)</label>
          <input
            id="cart-vat"
            type="text"
            inputMode="decimal"
            className="cart-panel__input"
            value={vatInput}
            placeholder={String(totals.vatRatePercent)}
            onChange={(e) => {
              setVatInput(e.target.value);
              const rate = Number(e.target.value);
              onSetVatRate(Number.isFinite(rate) ? rate : 0);
            }}
            onBlur={() => setVatInput('')}
          />
        </div>

        <div className="cart-panel__row">
          <span>VAT ({totals.vatRatePercent.toFixed(2)}%)</span>
          <span>{formatBdt(totals.vatMinor)}</span>
        </div>

        <div className="cart-panel__row cart-panel__row--total">
          <span>Total</span>
          <span>{formatBdt(totals.totalMinor)}</span>
        </div>

        <div className="cart-panel__row cart-panel__row--input">
          <label htmlFor="cart-cash">Cash received (৳)</label>
          <input
            id="cart-cash"
            type="text"
            inputMode="decimal"
            className="cart-panel__input"
            value={cashInput}
            onChange={(e) => {
              setCashInput(e.target.value);
              const minor = parseTakaToMinor(e.target.value);
              onSetCashReceived(minor ?? 0);
            }}
          />
        </div>

        <div className="cart-panel__row cart-panel__row--change">
          <span>Change</span>
          <span>{formatBdt(totals.changeMinor)}</span>
        </div>
      </section>

      {submissionError && (
        <div className="cart-panel__error" role="alert">
          {submissionError}
        </div>
      )}

      <footer className="cart-panel__footer">
        <Button
          size="lg"
          fullWidth
          disabled={!canSubmit || submitting}
          loading={submitting}
          onClick={onSubmit}
        >
          Complete sale · {formatBdt(totals.totalMinor)}
        </Button>
      </footer>

      <CustomerPickerModal
        open={customerPickerOpen}
        onClose={() => setCustomerPickerOpen(false)}
        onSelect={onSelectCustomer}
      />
    </aside>
  );
}
