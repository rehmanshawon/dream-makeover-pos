import { useMemo, useState, type JSX } from 'react';
import { Modal } from '../../../ui/Modal';
import { Input } from '../../../ui/Input';
import { Spinner } from '../../../ui/Spinner';
import { EmptyState } from '../../../ui/EmptyState';
import { Button } from '../../../ui/Button';
import { useCustomers } from '../../../api/customer-hooks';
import './CustomerPickerModal.css';

interface CustomerPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (customerId: string, customerName: string, customerTier: string) => void;
}

export function CustomerPickerModal({
  open,
  onClose,
  onSelect,
}: CustomerPickerModalProps): JSX.Element {
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useCustomers();

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.slice(0, 50);
    return data.filter(
      (c) => c.fullName.toLowerCase().includes(q) || c.phoneNumber.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <Modal open={open} title="Select customer" onClose={onClose} size="md">
      <div className="customer-picker">
        <Input
          autoFocus
          placeholder="Search by name or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {isLoading && (
          <div className="customer-picker__loading">
            <Spinner label="Loading customers" />
          </div>
        )}

        {error && (
          <div className="customer-picker__error" role="alert">
            Unable to load customers.
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <EmptyState title="No matching customers" description="Try a different search term." />
        )}

        {!isLoading && !error && filtered.length > 0 && (
          <ul className="customer-picker__list">
            {filtered.map((customer) => (
              <li key={customer.id}>
                <button
                  type="button"
                  className="customer-picker__option"
                  onClick={() => {
                    onSelect(customer.id, customer.fullName, customer.rewardTier);
                    onClose();
                  }}
                >
                  <span className="customer-picker__name">{customer.fullName}</span>
                  <span className="customer-picker__meta">
                    {customer.phoneNumber} · {customer.rewardTier}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="customer-picker__actions">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
