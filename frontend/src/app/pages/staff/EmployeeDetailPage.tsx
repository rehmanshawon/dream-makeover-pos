import { useState, type JSX } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useEmployee } from '../../../api/employee-hooks';
import { ApiError } from '../../../api/api-error';
import { Badge } from '../../../ui/Badge';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { Spinner } from '../../../ui/Spinner';
import { useAuth } from '../../auth/AuthContext';
import { Icon } from '../../components/Icon';
import { formatBdt, formatDate, formatDateTime } from '../../../utils/format';
import { EmployeeFormModal } from './EmployeeFormModal';
import { SalaryPaymentFormModal } from './SalaryPaymentFormModal';
import { SalaryPaymentHistory } from './SalaryPaymentHistory';
import './EmployeeDetailPage.css';

export function EmployeeDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { data, isLoading, error } = useEmployee(id);
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="employee-detail__loading">
        <Spinner label="Loading employee" />
      </div>
    );
  }

  if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="employee-detail">
        <EmptyState
          title={notFound ? 'Employee not found' : 'Unable to load employee'}
          description={
            notFound
              ? 'The employee may have been removed, or the link is incorrect.'
              : 'Please try again in a moment.'
          }
          action={
            <Link to="/staff" className="employee-detail__back">
              Back to staff
            </Link>
          }
        />
      </div>
    );
  }

  if (!data) return <></>;

  return (
    <div className="employee-detail">
      <div className="employee-detail__breadcrumb">
        <Link to="/staff">Staff</Link>
        <span aria-hidden="true"> / </span>
        <span>{data.fullName}</span>
      </div>

      <div className="employee-detail__grid">
        <Card
          title={data.fullName}
          subtitle={data.role}
          actions={
            <div className="employee-detail__actions">
              <Badge variant={data.status === 'ACTIVE' ? 'success' : 'neutral'}>
                {data.status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </Badge>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="button--icon"
                  aria-label="Edit"
                  title="Edit employee"
                  onClick={() => setEditOpen(true)}
                >
                  <Icon name="edit" size={16} />
                </Button>
              )}
            </div>
          }
        >
          <dl className="employee-detail__facts">
            <div className="employee-detail__fact">
              <dt>Salary</dt>
              <dd>
                {formatBdt(data.salaryMinor)}
                <span className="employee-detail__frequency">
                  {' '}
                  per {data.salaryFrequency.toLowerCase().replace('ly', '')}
                </span>
              </dd>
            </div>
            <div className="employee-detail__fact">
              <dt>Joined</dt>
              <dd>{formatDate(data.joinDate)}</dd>
            </div>
            <div className="employee-detail__fact">
              <dt>Phone</dt>
              <dd>{data.phone ?? '—'}</dd>
            </div>
            <div className="employee-detail__fact">
              <dt>Last updated</dt>
              <dd>{formatDateTime(data.updatedAt)}</dd>
            </div>
          </dl>

          {data.note && (
            <div className="employee-detail__note">
              <span className="employee-detail__note-label">Notes</span>
              <p className="employee-detail__note-text">{data.note}</p>
            </div>
          )}
        </Card>

        <Card
          title="Salary history"
          subtitle="Payments recorded for this employee"
          actions={
            isAdmin ? (
              <Button size="sm" onClick={() => setPaymentOpen(true)}>
                Record payment
              </Button>
            ) : undefined
          }
        >
          <SalaryPaymentHistory employee={data} />
        </Card>
      </div>

      {isAdmin && (
        <>
          <EmployeeFormModal open={editOpen} employee={data} onClose={() => setEditOpen(false)} />
          <SalaryPaymentFormModal
            open={paymentOpen}
            employee={data}
            onClose={() => setPaymentOpen(false)}
          />
        </>
      )}
    </div>
  );
}
