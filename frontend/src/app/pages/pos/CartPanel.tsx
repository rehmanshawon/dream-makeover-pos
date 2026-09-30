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
  customerRewardPoints: number;
  rewardOffer: { tier: string; redeemPoints: number; discountMinor: number } | null;
  redeemRewardPoints: boolean;
  onRemoveItem: (kind: CartItem['kind'], id: string) => void;
  onSetQuantity: (kind: CartItem['kind'], id: string, quantity: number) => void;
  onSelectCustomer: (id: string, name: string, tier: string, points: number) => void;
  onClearCustomer: () => void;
  onSetDiscount: (minorUnits: number) => void;
  onSetRewardRedemption: (enabled: boolean, discountMinor: number) => void;
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
  customerRewardPoints,
  rewardOffer,
  redeemRewardPoints,
  onRemoveItem,
  onSetQuantity,
  onSelectCustomer,
  onClearCustomer,
  onSetDiscount,
  onSetRewardRedemption,
  onSetCashReceived,
  onClearCart,
  submissionError,
  submitting,
  onSubmit,
}: CartPanelProps): JSX.Element {
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [cashInput, setCashInput] = useState('');

  const canSubmit =
    items.length > 0 &&
    totals.cashReceivedMinor >= totals.totalMinor &&
    totals.redemptionAffordable;

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
              <div className="cart-panel__points">
                {customerRewardPoints.toLocaleString()} points
              </div>
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

        {rewardOffer && (
          <section className="cart-panel__reward" aria-label="Reward redemption">
            <div>
              <strong>{rewardOffer.tier} reward available</strong>
              <p>
                Redeem {rewardOffer.redeemPoints.toLocaleString()} points for{' '}
                {formatBdt(rewardOffer.discountMinor)} off.
              </p>
            </div>
            <Button
              size="sm"
              variant={redeemRewardPoints ? 'secondary' : 'primary'}
              disabled={
                !redeemRewardPoints &&
                totals.subtotalMinor - totals.discountMinor < rewardOffer.discountMinor
              }
              onClick={() => onSetRewardRedemption(!redeemRewardPoints, rewardOffer.discountMinor)}
            >
              {redeemRewardPoints ? 'Remove reward' : 'Apply reward'}
            </Button>
            {redeemRewardPoints && !totals.redemptionAffordable && (
              <p className="cart-panel__reward-error">
                Add items to cover the reward discount or remove the reward.
              </p>
            )}
          </section>
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

        {totals.rewardDiscountMinor > 0 && (
          <div className="cart-panel__row cart-panel__row--reward">
            <span>Reward discount</span>
            <span>−{formatBdt(totals.rewardDiscountMinor)}</span>
          </div>
        )}

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
