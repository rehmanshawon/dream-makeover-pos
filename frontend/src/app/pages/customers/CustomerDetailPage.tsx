import type { JSX } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCustomer } from '../../../api/customer-hooks';
import { ApiError } from '../../../api/api-error';
import { Badge, type BadgeVariant } from '../../../ui/Badge';
import { Card } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { Spinner } from '../../../ui/Spinner';
import { formatBdt, formatDateTime } from '../../../utils/format';
import type { CustomerRewardTier } from '../../../types/customers';
import { useState } from 'react';
import { Button } from '../../../ui/Button';
import { useAuth } from '../../auth/AuthContext';
import { CustomerFormModal } from './CustomerFormModal';
import { CustomerHistoryTable } from './CustomerHistoryTable';
import './CustomerDetailPage.css';

const TIER_VARIANT: Record<CustomerRewardTier, BadgeVariant> = {
  Silver: 'neutral',
  Gold: 'warning',
  Platinum: 'accent',
  Diamond: 'success',
};

export function CustomerDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useCustomer(id);
  const { isAdmin } = useAuth();
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="customer-detail__loading">
        <Spinner label="Loading customer" />
      </div>
    );
  }

  if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="customer-detail">
        <EmptyState
          title={notFound ? 'Customer not found' : 'Unable to load customer'}
          description={
            notFound
              ? 'The customer may have been removed, or the link is incorrect.'
              : 'Please try again in a moment.'
          }
          action={
            <Link to="/customers" className="customer-detail__back">
              Back to customers
            </Link>
          }
        />
      </div>
    );
  }

  if (!data) return <></>;

  return (
    <div className="customer-detail">
      <div className="customer-detail__breadcrumb">
        <Link to="/customers">Customers</Link>
        <span aria-hidden="true"> / </span>
        <span>{data.fullName}</span>
      </div>

      <div className="customer-detail__grid">
        <Card
          title={data.fullName}
          subtitle={`Customer since ${formatDateTime(data.createdAt)}`}
          actions={
            <div className="customer-detail__actions">
              <Badge variant={TIER_VARIANT[data.rewardTier]}>{data.rewardTier}</Badge>
              {isAdmin && (
                <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                  Edit
                </Button>
              )}
            </div>
          }
        >
          <dl className="customer-detail__facts">
            <div className="customer-detail__fact">
              <dt>Phone</dt>
              <dd>{data.phoneNumber}</dd>
            </div>
            <div className="customer-detail__fact">
              <dt>Reward points</dt>
              <dd>{data.rewardPoints.toLocaleString('en-BD')}</dd>
            </div>
            <div className="customer-detail__fact">
              <dt>Lifetime spend</dt>
              <dd>{formatBdt(data.lifetimeSpendMinor)}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Purchase history" subtitle="Recent activity">
          <CustomerHistoryTable customerId={data.id} />
        </Card>
        {isAdmin && (
          <CustomerFormModal open={editOpen} customer={data} onClose={() => setEditOpen(false)} />
        )}
      </div>
    </div>
  );
}
