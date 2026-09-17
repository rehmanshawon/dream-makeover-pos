import { useState, type JSX } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePackage } from '../../../api/package-hooks';
import { ApiError } from '../../../api/api-error';
import { Badge } from '../../../ui/Badge';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { Spinner } from '../../../ui/Spinner';
import { Table, type TableColumn } from '../../../ui/Table';
import { useAuth } from '../../auth/AuthContext';
import { Icon } from '../../components/Icon';
import { formatBdt, formatDateTime } from '../../../utils/format';
import type { PackageItem } from '../../../types/packages';
import { PackageFormModal } from './PackageFormModal';
import './PackageDetailPage.css';

export function PackageDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { data, isLoading, error } = usePackage(id);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="package-detail__loading">
        <Spinner label="Loading package" />
      </div>
    );
  }

  if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="package-detail">
        <EmptyState
          title={notFound ? 'Package not found' : 'Unable to load package'}
          description={
            notFound
              ? 'The package may have been removed, or the link is incorrect.'
              : 'Please try again in a moment.'
          }
          action={
            <Link to="/packages" className="package-detail__back">
              Back to packages
            </Link>
          }
        />
      </div>
    );
  }

  if (!data) return <></>;

  const columns: TableColumn<PackageItem>[] = [
    {
      key: 'itemKind',
      header: 'Type',
      render: (item) => (
        <Badge variant={item.itemKind === 'SERVICE' ? 'accent' : 'neutral'}>
          {item.itemKind === 'SERVICE' ? 'Service' : 'Product'}
        </Badge>
      ),
    },
    {
      key: 'itemName',
      header: 'Component',
      render: (item) => <span className="package-detail__item-name">{item.itemName}</span>,
    },
    {
      key: 'snapshotPrice',
      header: 'Price at snapshot',
      align: 'right',
      render: (item) => formatBdt(item.snapshotPriceMinor),
    },
  ];

  return (
    <div className="package-detail">
      <div className="package-detail__breadcrumb">
        <Link to="/packages">Packages</Link>
        <span aria-hidden="true"> / </span>
        <span>{data.name}</span>
      </div>

      <div className="package-detail__grid">
        <Card
          title={data.name}
          subtitle={data.description ?? 'No description'}
          actions={
            <div className="package-detail__actions">
              <Badge variant={data.active ? 'success' : 'neutral'}>
                {data.active ? 'Active' : 'Inactive'}
              </Badge>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="button--icon"
                  aria-label="Edit"
                  title="Edit package"
                  onClick={() => setEditOpen(true)}
                >
                  <Icon name="edit" size={16} />
                </Button>
              )}
            </div>
          }
        >
          <dl className="package-detail__facts">
            <div className="package-detail__fact">
              <dt>Components total</dt>
              <dd>{formatBdt(data.normalPriceMinor)}</dd>
            </div>
            <div className="package-detail__fact">
              <dt>Package price</dt>
              <dd className="package-detail__fact-price">{formatBdt(data.packagePriceMinor)}</dd>
            </div>
            <div className="package-detail__fact">
              <dt>Customer saves</dt>
              <dd className="package-detail__fact-savings">{formatBdt(data.savingsMinor)}</dd>
            </div>
            <div className="package-detail__fact">
              <dt>Last updated</dt>
              <dd>{formatDateTime(data.updatedAt)}</dd>
            </div>
          </dl>
        </Card>

        <Card
          title="Composition"
          subtitle={`${data.items.length} component${data.items.length === 1 ? '' : 's'}`}
        >
          {data.items.length === 0 ? (
            <EmptyState
              title="No components"
              description="This package has no components. Edit it to add some."
            />
          ) : (
            <Table columns={columns} rows={data.items} getRowKey={(item) => item.id} />
          )}
        </Card>
      </div>

      {isAdmin && (
        <PackageFormModal open={editOpen} package={data} onClose={() => setEditOpen(false)} />
      )}
    </div>
  );
}
