import { useState, type JSX } from 'react';
import { ApiError } from '../../../api/api-error';
import { useCheckout } from '../../../api/checkout-hooks';
import type { CheckoutResponse } from '../../../types/checkout';
import { CatalogPanel } from './CatalogPanel';
import { CartPanel } from './CartPanel';
import { SaleConfirmationModal } from './SaleConfirmationModal';
import { useCart } from './use-cart';
import { buildCheckoutRequest } from './checkout-mapper';
import './NewSalePage.css';

/**
 * Point-of-sale screen.
 *
 * Left panel: catalog of items available for sale.
 * Right panel: the current cart.
 *
 * The "Complete sale" button submits the cart to the backend, shows a
 * confirmation, and clears the cart. On error, the cart is preserved so
 * the cashier can fix the issue and retry.
 */
export function NewSalePage(): JSX.Element {
  const cart = useCart();
  const checkout = useCheckout();
  const [confirmation, setConfirmation] = useState<CheckoutResponse | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    setSubmissionError(null);

    if (cart.state.items.length === 0) {
      setSubmissionError('The cart is empty.');
      return;
    }

    if (cart.totals.cashReceivedMinor < cart.totals.totalMinor) {
      setSubmissionError('Cash received is less than the total.');
      return;
    }

    const request = buildCheckoutRequest(cart.state.items, cart.totals, cart.state.customerId);

    try {
      const response = await checkout.mutateAsync(request);
      // Show the confirmation first so the modal has its own copy of the
      // response, then clear the cart.
      setConfirmation(response);
      cart.clear();
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmissionError(err.message);
      } else {
        setSubmissionError('Unable to complete the sale. Please try again.');
      }
    }
  };

  const handleCloseConfirmation = (): void => {
    setConfirmation(null);
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
        submissionError={submissionError}
        submitting={checkout.isPending}
      />

      <SaleConfirmationModal
        open={confirmation !== null}
        response={confirmation}
        onClose={handleCloseConfirmation}
      />
    </div>
  );
}
