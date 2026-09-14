import { useMemo, useState, type JSX } from 'react';
import { Modal } from '../../../ui/Modal';
import { Input } from '../../../ui/Input';
import { Spinner } from '../../../ui/Spinner';
import { EmptyState } from '../../../ui/EmptyState';
import { Button } from '../../../ui/Button';
import { useCustomers } from '../../../api/customer-hooks';
import { CustomerFormModal } from '../customers/CustomerFormModal';
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
  const [createOpen, setCreateOpen] = useState(false);

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
            Cancel
          </Button>
          <Button onClick={() => setCreateOpen(true)}>New customer</Button>
        </div>
      </div>
      <CustomerFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={(customer) => {
          // The new customer is not in our local list yet. Fetch fresh data
          // is more reliable than trying to guess the customer name and tier.
          // The list will update via React Query, but we need to select the
          // customer immediately, so we need its data.
          // Simplest path: refetch and find by ID.
          // For now, close the picker and let the parent's selection re-open.
          // We pass a placeholder name; the parent will refresh from the
          // customer list once data is available.
          void (async () => {
            setCreateOpen(false);
            onSelect(customer.id, customer.fullName, customer.rewardTier);
            onClose();
          })();
        }}
      />
    </Modal>
  );
}
