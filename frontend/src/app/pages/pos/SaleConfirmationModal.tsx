import type { JSX } from 'react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import { formatBdt } from '../../../utils/format';
import type { CheckoutResponse } from '../../../types/checkout';
import './SaleConfirmationModal.css';

interface SaleConfirmationModalProps {
  open: boolean;
  response: CheckoutResponse | null;
  onClose: () => void;
}

export function SaleConfirmationModal({
  open,
  response,
  onClose,
}: SaleConfirmationModalProps): JSX.Element {
  if (!response) {
    return <></>;
  }

  return (
    <Modal
      open={open}
      title="Sale completed"
      onClose={onClose}
      size="sm"
      closeOnOverlayClick={false}
    >
      <div className="sale-confirmation">
        <div className="sale-confirmation__check" aria-hidden="true">
          ✓
        </div>
        {response.customer && (
          <p className="sale-confirmation__customer">{response.customer.name}</p>
        )}
        <dl className="sale-confirmation__facts">
          <div className="sale-confirmation__fact">
            <dt>Invoice</dt>
            <dd className="sale-confirmation__invoice">{response.invoiceId}</dd>
          </div>
          <div className="sale-confirmation__fact">
            <dt>Total</dt>
            <dd>{formatBdt(response.totalMinor)}</dd>
          </div>
          <div className="sale-confirmation__fact">
            <dt>Cash received</dt>
            <dd>{formatBdt(response.cashReceivedMinor)}</dd>
          </div>
          <div className="sale-confirmation__fact sale-confirmation__fact--highlight">
            <dt>Change</dt>
            <dd>{formatBdt(response.changeMinor)}</dd>
          </div>
          <div className="sale-confirmation__fact">
            <dt>Cashier</dt>
            <dd>{response.cashier}</dd>
          </div>
        </dl>

        {response.customer && response.loyaltyPointsEarned > 0 && (
          <div className="sale-confirmation__loyalty">
            <p>
              <strong>{response.loyaltyPointsEarned}</strong> loyalty{' '}
              {response.loyaltyPointsEarned === 1 ? 'point' : 'points'} earned
            </p>
            <p className="sale-confirmation__tier">
              Total points: <strong>{response.customer.totalPointsAfterSale}</strong>
            </p>
            <p className="sale-confirmation__tier">
              Tier: <strong>{response.customer.tier}</strong>
            </p>
          </div>
        )}

        <div className="sale-confirmation__actions">
          <Button size="lg" fullWidth onClick={onClose}>
            New sale
          </Button>
        </div>
      </div>
    </Modal>
  );
}
