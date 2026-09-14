import type { JSX } from 'react';
import { CatalogPanel } from './CatalogPanel';
import { CartPanel } from './CartPanel';
import { useCart } from './use-cart';
import './NewSalePage.css';

/**
 * Point-of-sale screen.
 *
 * Left panel: catalog of items available for sale.
 * Right panel: the current cart.
 *
 * Checkout submission is implemented in the next sprint. For now the
 * "Complete sale" button is disabled unless the cart is valid.
 */
export function NewSalePage(): JSX.Element {
  const cart = useCart();

  const handleSubmit = (): void => {
    // Submission is wired in Sprint 14 — Part 2.
    // This no-op exists so the button is interactive and testable now.
  };

  return (
    <div className="pos-layout">
      <div className="pos-layout__catalog">
        <CatalogPanel onAdd={cart.addItem} />
      </div>
      <CartPanel
        items={cart.state.items}
        totals={cart.totals}
        customerId={cart.state.customerId}
        customerName={cart.state.customerName}
        customerTier={cart.state.customerTier}
        onRemoveItem={cart.removeItem}
        onSetQuantity={cart.setQuantity}
        onSelectCustomer={cart.setCustomer}
        onClearCustomer={cart.clearCustomer}
        onSetDiscount={cart.setDiscount}
        onSetCashReceived={cart.setCashReceived}
        onClearCart={cart.clear}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
