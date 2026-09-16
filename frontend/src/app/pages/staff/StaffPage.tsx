import { useMemo, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useEmployees,
  useUpdateEmployee,
  useDeactivateEmployee,
} from '../../../api/employee-hooks';
import { ApiError } from '../../../api/api-error';
import { Badge, type BadgeVariant } from '../../../ui/Badge';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { Input } from '../../../ui/Input';
import { Spinner } from '../../../ui/Spinner';
import { Table, type TableColumn } from '../../../ui/Table';
import { useAuth } from '../../auth/AuthContext';
import { formatBdt, formatDate } from '../../../utils/format';
import type { Employee, EmployeeStatus } from '../../../types/employees';
import { EmployeeFormModal } from './EmployeeFormModal';
import './StaffPage.css';

type StatusFilter = 'all' | EmployeeStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'INACTIVE', label: 'Inactive' },
];

const STATUS_VARIANT: Record<EmployeeStatus, BadgeVariant> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
};

export function StaffPage(): JSX.Element {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const { data, isLoading, error } = useEmployees();
  const updateMutation = useUpdateEmployee();
  const deactivateMutation = useDeactivateEmployee();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | undefined>(undefined);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (q) {
        const inName = e.fullName.toLowerCase().includes(q);
        const inRole = e.role.toLowerCase().includes(q);
        if (!inName && !inRole) return false;
      }
      return true;
    });
  }, [data, search, statusFilter]);

  const handleToggleStatus = async (employee: Employee): Promise<void> => {
    setActionError(null);
    try {
      if (employee.status === 'ACTIVE') {
        await deactivateMutation.mutateAsync(employee.id);
      } else {
        await updateMutation.mutateAsync({
          id: employee.id,
          payload: { status: 'ACTIVE' },
        });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError('Unable to update the employee. Please try again.');
      }
    }
  };

  const busy = updateMutation.isPending || deactivateMutation.isPending;

  const columns: TableColumn<Employee>[] = [
    {
      key: 'fullName',
      header: 'Name',
      render: (e) => <span className="staff-cell__name">{e.fullName}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      render: (e) => e.role,
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (e) => e.phone ?? '—',
    },
    {
      key: 'salary',
      header: 'Salary',
      align: 'right',
      render: (e) => (
        <>
          {formatBdt(e.salaryMinor)}
          <span className="staff-cell__frequency"> / {e.salaryFrequency.toLowerCase()}</span>
        </>
      ),
    },
    {
      key: 'joinDate',
      header: 'Joined',
      render: (e) => formatDate(e.joinDate),
    },
    {
      key: 'status',
      header: 'Status',
      render: (e) => (
        <Badge variant={STATUS_VARIANT[e.status]}>
          {e.status === 'ACTIVE' ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  if (isAdmin) {
    columns.push({
      key: 'actions',
      header: '',
      align: 'right',
      render: (e) => (
        <div className="staff-page__row-actions" onClick={(ev) => ev.stopPropagation()}>
          <Button size="sm" variant="secondary" onClick={() => setEditing(e)}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(e)} disabled={busy}>
            {e.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    });
  }

  return (
    <div className="staff-page">
      <Card
        title="Staff"
        subtitle="Employee records and salary configuration"
        actions={
          isAdmin ? <Button onClick={() => setCreateOpen(true)}>New employee</Button> : undefined
        }
      >
        <div className="staff-page__filters">
          <div className="staff-page__filter-group" role="group" aria-label="Status filter">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`staff-page__chip${
                  statusFilter === f.key ? ' staff-page__chip--active' : ''
                }`}
                onClick={() => setStatusFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="staff-page__search">
            <Input
              placeholder="Search by name or role"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {actionError && (
          <div className="staff-page__error" role="alert">
            {actionError}
          </div>
        )}

        {isLoading && (
          <div className="staff-page__loading">
            <Spinner label="Loading employees" />
          </div>
        )}

        {error && (
          <div className="staff-page__error" role="alert">
            {error instanceof ApiError ? error.message : 'Unable to load employees.'}
          </div>
        )}

        {!isLoading && !error && data && data.length === 0 && (
          <EmptyState
            title="No employees yet"
            description={
              isAdmin
                ? 'Add the first employee to start tracking payroll.'
                : 'No employees have been added.'
            }
            action={
              isAdmin ? (
                <Button onClick={() => setCreateOpen(true)}>Add employee</Button>
              ) : undefined
            }
          />
        )}

        {!isLoading && !error && data && data.length > 0 && filtered.length === 0 && (
          <EmptyState
            title="No matching employees"
            description="Try a different search or status filter."
          />
        )}

        {!isLoading && !error && filtered.length > 0 && (
          <Table
            columns={columns}
            rows={filtered}
            getRowKey={(e) => e.id}
            onRowClick={(e) => navigate(`/staff/${e.id}`)}
          />
        )}
      </Card>

      {isAdmin && (
        <>
          <EmployeeFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
          <EmployeeFormModal
            open={editing !== undefined}
            {...(editing ? { employee: editing } : {})}
            onClose={() => setEditing(undefined)}
          />
        </>
      )}
    </div>
  );
}
