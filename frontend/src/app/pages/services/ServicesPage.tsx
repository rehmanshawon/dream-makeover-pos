import { useMemo, useState, type JSX } from 'react';
import { useSalonServices, useUpdateService } from '../../../api/salon-service-hooks';
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
  const updateMutation = useUpdateService();

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingService, setEditingService] = useState<SalonService | undefined>(undefined);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((s) => s.name.toLowerCase().includes(q));
  }, [data, search]);

  const handleToggleActive = async (service: SalonService): Promise<void> => {
    setActionError(null);
    try {
      await updateMutation.mutateAsync({
        id: service.id,
        payload: { active: !service.active },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError('Unable to update the service. Please try again.');
      }
    }
  };

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

  if (isAdmin) {
    columns.push({
      key: 'actions',
      header: '',
      align: 'right',
      render: (s) => (
        <div className="services-page__row-actions">
          <Button size="sm" variant="secondary" onClick={() => setEditingService(s)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleToggleActive(s)}
            disabled={updateMutation.isPending}
          >
            {s.active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    });
  }

  return (
    <div className="services-page">
      <Card
        title="Parlour services"
        subtitle="Salon treatments offered to customers"
        actions={
          isAdmin ? <Button onClick={() => setCreateOpen(true)}>New service</Button> : undefined
        }
      >
        <div className="services-page__toolbar">
          <Input
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {actionError && (
          <div className="services-page__error" role="alert">
            {actionError}
          </div>
        )}

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
              isAdmin ? <Button onClick={() => setCreateOpen(true)}>Add service</Button> : undefined
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

      {isAdmin && (
        <>
          <ServiceFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
          <ServiceFormModal
            open={editingService !== undefined}
            {...(editingService ? { service: editingService } : {})}
            onClose={() => setEditingService(undefined)}
          />
        </>
      )}
    </div>
  );
}
