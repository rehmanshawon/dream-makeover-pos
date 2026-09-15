import { useMemo, useState, type JSX } from 'react';
import { useSalonServices } from '../../../api/salon-service-hooks';
import { ApiError } from '../../../api/api-error';
import { Badge } from '../../../ui/Badge';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { Input } from '../../../ui/Input';
import { Spinner } from '../../../ui/Spinner';
import { Table, type TableColumn } from '../../../ui/Table';
import { useAuth } from '../../auth/AuthContext';
import { formatBdt } from '../../../utils/format';
import type { SalonService } from '../../../types/services';
import { ServiceFormModal } from './ServiceFormModal';
import './ServicesPage.css';

export function ServicesPage(): JSX.Element {
  const { isAdmin } = useAuth();
  const { data, isLoading, error } = useSalonServices(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((s) => s.name.toLowerCase().includes(q));
  }, [data, search]);

  const columns: TableColumn<SalonService>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (s) => <span className="service-cell__name">{s.name}</span>,
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (s) => `${s.durationMinutes} min`,
      align: 'right',
    },
    {
      key: 'price',
      header: 'Price',
      render: (s) => formatBdt(s.priceMinor),
      align: 'right',
    },
    {
      key: 'rewardWeight',
      header: 'Reward weight',
      render: (s) => `×${s.rewardPointWeight}`,
      align: 'right',
    },
    {
      key: 'active',
      header: 'Status',
      render: (s) => (
        <Badge variant={s.active ? 'success' : 'neutral'}>{s.active ? 'Active' : 'Inactive'}</Badge>
      ),
    },
  ];

  return (
    <div className="services-page">
      <Card
        title="Parlour services"
        subtitle="Salon treatments offered to customers"
        actions={
          isAdmin ? <Button onClick={() => setModalOpen(true)}>New service</Button> : undefined
        }
      >
        <div className="services-page__toolbar">
          <Input
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading && (
          <div className="services-page__loading">
            <Spinner label="Loading services" />
          </div>
        )}

        {error && (
          <div className="services-page__error" role="alert">
            {error instanceof ApiError ? error.message : 'Unable to load services.'}
          </div>
        )}

        {!isLoading && !error && data && data.length === 0 && (
          <EmptyState
            title="No services yet"
            description={
              isAdmin
                ? 'Add the first service to start selling it through the POS.'
                : 'Ask an administrator to add services.'
            }
            action={
              isAdmin ? <Button onClick={() => setModalOpen(true)}>Add service</Button> : undefined
            }
          />
        )}

        {!isLoading && !error && data && data.length > 0 && filtered.length === 0 && (
          <EmptyState title="No matching services" description="Try a different search term." />
        )}

        {!isLoading && !error && filtered.length > 0 && (
          <Table columns={columns} rows={filtered} getRowKey={(s) => s.id} />
        )}
      </Card>

      {isAdmin && <ServiceFormModal open={modalOpen} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
