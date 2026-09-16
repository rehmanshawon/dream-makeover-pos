import { useMemo, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePackages, useUpdatePackage } from '../../../api/package-hooks';
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
import type { Package } from '../../../types/packages';
import { PackageFormModal } from './PackageFormModal';
import './PackagesPage.css';

export function PackagesPage(): JSX.Element {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data, isLoading, error } = usePackages(false);
  const updateMutation = useUpdatePackage();

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Package | undefined>(undefined);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((p) => p.name.toLowerCase().includes(q));
  }, [data, search]);

  const handleToggleActive = async (pkg: Package): Promise<void> => {
    setActionError(null);
    try {
      await updateMutation.mutateAsync({
        id: pkg.id,
        payload: { active: !pkg.active },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError('Unable to update the package. Please try again.');
      }
    }
  };

  const columns: TableColumn<Package>[] = [
    {
      key: 'name',
      header: 'Package',
      render: (p) => <span className="package-cell__name">{p.name}</span>,
    },
    {
      key: 'components',
      header: 'Components',
      render: (p) => p.items.length,
      align: 'right',
    },
    {
      key: 'normalPrice',
      header: 'Components total',
      render: (p) => formatBdt(p.normalPriceMinor),
      align: 'right',
    },
    {
      key: 'packagePrice',
      header: 'Package price',
      render: (p) => <span className="package-cell__price">{formatBdt(p.packagePriceMinor)}</span>,
      align: 'right',
    },
    {
      key: 'savings',
      header: 'Savings',
      render: (p) => <span className="package-cell__savings">{formatBdt(p.savingsMinor)}</span>,
      align: 'right',
    },
    {
      key: 'active',
      header: 'Status',
      render: (p) => (
        <Badge variant={p.active ? 'success' : 'neutral'}>{p.active ? 'Active' : 'Inactive'}</Badge>
      ),
    },
  ];

  if (isAdmin) {
    columns.push({
      key: 'actions',
      header: '',
      align: 'right',
      render: (p) => (
        <div className="packages-page__row-actions" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="secondary" onClick={() => setEditing(p)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleToggleActive(p)}
            disabled={updateMutation.isPending}
          >
            {p.active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    });
  }

  return (
    <div className="packages-page">
      <Card
        title="Packages"
        subtitle="Bundled services and products sold together"
        actions={
          isAdmin ? <Button onClick={() => setCreateOpen(true)}>New package</Button> : undefined
        }
      >
        <div className="packages-page__toolbar">
          <Input
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {actionError && (
          <div className="packages-page__error" role="alert">
            {actionError}
          </div>
        )}

        {isLoading && (
          <div className="packages-page__loading">
            <Spinner label="Loading packages" />
          </div>
        )}

        {error && (
          <div className="packages-page__error" role="alert">
            {error instanceof ApiError ? error.message : 'Unable to load packages.'}
          </div>
        )}

        {!isLoading && !error && data && data.length === 0 && (
          <EmptyState
            title="No packages yet"
            description={
              isAdmin
                ? 'Create the first package to offer bundled savings.'
                : 'Ask an administrator to add packages.'
            }
            action={
              isAdmin ? (
                <Button onClick={() => setCreateOpen(true)}>Create package</Button>
              ) : undefined
            }
          />
        )}

        {!isLoading && !error && data && data.length > 0 && filtered.length === 0 && (
          <EmptyState title="No matching packages" description="Try a different search term." />
        )}

        {!isLoading && !error && filtered.length > 0 && (
          <Table
            columns={columns}
            rows={filtered}
            getRowKey={(p) => p.id}
            onRowClick={(p) => navigate(`/packages/${p.id}`)}
          />
        )}
      </Card>

      {isAdmin && (
        <>
          <PackageFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
          {editing !== undefined && (
            <PackageFormModal open package={editing} onClose={() => setEditing(undefined)} />
          )}
        </>
      )}
    </div>
  );
}
