import { useState, type JSX } from 'react';
import { ApiError } from '../../../api/api-error';
import { useCheckout } from '../../../api/checkout-hooks';
import { BUSINESS_INFO } from '../../../config/business';
import type { CheckoutResponse } from '../../../types/checkout';
import { CatalogPanel } from './CatalogPanel';
import { CartPanel } from './CartPanel';
import { SaleConfirmationModal } from './SaleConfirmationModal';
import { useCart } from './use-cart';
import { buildCheckoutRequest } from './checkout-mapper';
import { buildReceiptData } from './receipt/build-receipt-data';
import { formatReceipt } from './receipt/receipt-formatter';
import { getReceiptPrinter } from './receipt/printer/printer-provider';
import './NewSalePage.css';

export function NewSalePage(): JSX.Element {
  const cart = useCart();
  const checkout = useCheckout();
  const [confirmation, setConfirmation] = useState<CheckoutResponse | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

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
      setConfirmation(response);
      setPrintError(null);
      cart.clear();
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmissionError(err.message);
      } else {
        setSubmissionError('Unable to complete the sale. Please try again.');
      }
    }
  };

  const handlePrint = async (): Promise<void> => {
    if (!confirmation) return;

    setPrinting(true);
    setPrintError(null);

    try {
      const data = buildReceiptData(confirmation, BUSINESS_INFO);
      const lines = formatReceipt(data);
      const printer = getReceiptPrinter();
      await printer.print(lines);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to print receipt.';
      setPrintError(message);
    } finally {
      setPrinting(false);
    }
  };

  const handleCloseConfirmation = (): void => {
    setConfirmation(null);
    setPrintError(null);
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
        printing={printing}
        printError={printError}
        onPrint={handlePrint}
        onClose={handleCloseConfirmation}
      />
    </div>
  );
}
