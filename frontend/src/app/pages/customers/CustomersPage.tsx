import { useMemo, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from '../../../api/customer-hooks';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { Input } from '../../../ui/Input';
import { Spinner } from '../../../ui/Spinner';
import { Table, type TableColumn } from '../../../ui/Table';
import { Badge, type BadgeVariant } from '../../../ui/Badge';
import { ApiError } from '../../../api/api-error';
import { formatBdt, formatDate } from '../../../utils/format';
import type { Customer, CustomerRewardTier } from '../../../types/customers';
import { CustomerFormModal } from './CustomerFormModal';
import './CustomersPage.css';

const TIER_VARIANT: Record<CustomerRewardTier, BadgeVariant> = {
  Silver: 'neutral',
  Gold: 'warning',
  Platinum: 'accent',
  Diamond: 'success',
};

export function CustomersPage(): JSX.Element {
  const navigate = useNavigate();
  const { data, isLoading, error } = useCustomers();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (c) => c.fullName.toLowerCase().includes(q) || c.phoneNumber.toLowerCase().includes(q),
    );
  }, [data, search]);

  const columns: TableColumn<Customer>[] = [
    {
      key: 'fullName',
      header: 'Name',
      render: (c) => <span className="customer-cell__name">{c.fullName}</span>,
    },
    {
      key: 'phoneNumber',
      header: 'Phone',
      render: (c) => c.phoneNumber,
    },
    {
      key: 'rewardTier',
      header: 'Tier',
      render: (c) => <Badge variant={TIER_VARIANT[c.rewardTier]}>{c.rewardTier}</Badge>,
    },
    {
      key: 'rewardPoints',
      header: 'Points',
      align: 'right',
      render: (c) => c.rewardPoints.toLocaleString('en-BD'),
    },
    {
      key: 'lifetimeSpend',
      header: 'Lifetime spend',
      align: 'right',
      render: (c) => formatBdt(c.lifetimeSpendMinor),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (c) => formatDate(c.createdAt),
    },
  ];

  return (
    <div className="customers-page">
      <Card
        title="Customers"
        subtitle="Loyalty members and their purchase history"
        actions={<Button onClick={() => setModalOpen(true)}>New customer</Button>}
      >
        <div className="customers-page__toolbar">
          <Input
            placeholder="Search by name or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading && (
          <div className="customers-page__loading">
            <Spinner label="Loading customers" />
          </div>
        )}

        {error && (
          <div className="customers-page__error" role="alert">
            {error instanceof ApiError ? error.message : 'Unable to load customers.'}
          </div>
        )}

        {!isLoading && !error && data && data.length === 0 && (
          <EmptyState
            title="No customers yet"
            description="Add your first customer to start tracking loyalty and purchase history."
            action={<Button onClick={() => setModalOpen(true)}>Add the first customer</Button>}
          />
        )}

        {!isLoading && !error && data && data.length > 0 && (
          <>
            {filtered.length === 0 ? (
              <EmptyState
                title="No matching customers"
                description="Try a different name or phone number."
              />
            ) : (
              <Table
                columns={columns}
                rows={filtered}
                getRowKey={(c) => c.id}
                onRowClick={(c) => navigate(`/customers/${c.id}`)}
              />
            )}
          </>
        )}
      </Card>

      <CustomerFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={(customer) => navigate(`/customers/${customer.id}`)}
      />
    </div>
  );
}
