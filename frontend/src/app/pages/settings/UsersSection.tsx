import { useMemo, useState, type JSX } from 'react';
import { useUsers, useUpdateUser } from '../../../api/user-hooks';
import { ApiError } from '../../../api/api-error';
import { Badge } from '../../../ui/Badge';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { EmptyState } from '../../../ui/EmptyState';
import { Input } from '../../../ui/Input';
import { Spinner } from '../../../ui/Spinner';
import { Table, type TableColumn } from '../../../ui/Table';
import { Icon } from '../../components/Icon';
import { useAuth } from '../../auth/AuthContext';
import { formatDateTime } from '../../../utils/format';
import type { User } from '../../../types/users';
import { UserFormModal } from './UserFormModal';
import './UsersSection.css';

export function UsersSection(): JSX.Element {
  const { user: currentUser } = useAuth();
  const { data, isLoading, error } = useUsers();
  const updateMutation = useUpdateUser();

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<User | undefined>(undefined);
  const [pendingDeactivate, setPendingDeactivate] = useState<User | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (u) => u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q),
    );
  }, [data, search]);

  const handleReactivate = async (target: User): Promise<void> => {
    setActionError(null);
    try {
      await updateMutation.mutateAsync({
        id: target.id,
        payload: { active: true },
      });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Unable to update the user.');
    }
  };

  const handleConfirmDeactivate = async (): Promise<void> => {
    if (!pendingDeactivate) return;
    setActionError(null);
    try {
      await updateMutation.mutateAsync({
        id: pendingDeactivate.id,
        payload: { active: false },
      });
      setPendingDeactivate(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Unable to deactivate the user.');
      setPendingDeactivate(null);
    }
  };

  const columns: TableColumn<User>[] = [
    {
      key: 'username',
      header: 'Username',
      render: (u) => <span className="users-section__username">{u.username}</span>,
    },
    {
      key: 'displayName',
      header: 'Display name',
      render: (u) => u.displayName,
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) => <Badge variant={u.role === 'ADMIN' ? 'accent' : 'neutral'}>{u.role}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (
        <Badge variant={u.active ? 'success' : 'neutral'}>{u.active ? 'Active' : 'Inactive'}</Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (u) => formatDateTime(u.createdAt),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (u) => {
        const isSelf = currentUser?.id === u.id;
        return (
          <div className="users-section__row-actions">
            <Button
              size="sm"
              variant="secondary"
              className="button--icon"
              aria-label="Edit"
              title="Edit user"
              onClick={() => setEditing(u)}
            >
              <Icon name="edit" size={16} />
            </Button>
            {u.active ? (
              <Button
                size="sm"
                variant="ghost"
                className="button--icon"
                aria-label="Deactivate"
                onClick={() => setPendingDeactivate(u)}
                disabled={isSelf || updateMutation.isPending}
                title={isSelf ? 'You cannot deactivate your own account' : 'Deactivate user'}
              >
                <Icon name="power" size={16} />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="button--icon"
                aria-label="Activate"
                title="Activate user"
                onClick={() => handleReactivate(u)}
                disabled={updateMutation.isPending}
              >
                <Icon name="power" size={16} />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <Card
      title="Users"
      subtitle="Login accounts and their roles"
      actions={<Button onClick={() => setCreateOpen(true)}>New user</Button>}
    >
      <div className="users-section__toolbar">
        <Input
          placeholder="Search by username or display name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {actionError && (
        <div className="users-section__error" role="alert">
          {actionError}
        </div>
      )}

      {isLoading && (
        <div className="users-section__center">
          <Spinner label="Loading users" />
        </div>
      )}

      {error && (
        <div className="users-section__error" role="alert">
          {error instanceof ApiError ? error.message : 'Unable to load users.'}
        </div>
      )}

      {!isLoading && !error && data && data.length === 0 && (
        <EmptyState
          title="No users"
          description="Create the first user to allow someone to sign in."
          action={<Button onClick={() => setCreateOpen(true)}>Create user</Button>}
        />
      )}

      {!isLoading && !error && data && data.length > 0 && filtered.length === 0 && (
        <EmptyState title="No matching users" description="Try a different search term." />
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <Table columns={columns} rows={filtered} getRowKey={(u) => u.id} />
      )}

      <UserFormModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <UserFormModal
        open={editing !== undefined}
        {...(editing !== undefined ? { user: editing } : {})}
        onClose={() => setEditing(undefined)}
      />

      <ConfirmDialog
        open={pendingDeactivate !== null}
        title="Deactivate user"
        message={
          pendingDeactivate
            ? `Deactivate ${pendingDeactivate.displayName}? They will not be able to sign in until reactivated.`
            : ''
        }
        confirmLabel="Deactivate"
        variant="danger"
        loading={updateMutation.isPending}
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setPendingDeactivate(null)}
      />
    </Card>
  );
}
