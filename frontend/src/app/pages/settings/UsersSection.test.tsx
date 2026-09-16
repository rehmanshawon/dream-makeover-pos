import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/render-with-providers';
import { UsersSection } from './UsersSection';
import type { AuthenticatedUser } from '../../../types/auth';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

const USERS = [
  {
    id: '1',
    username: 'admin',
    displayName: 'Admin',
    role: 'ADMIN',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    username: 'staff',
    displayName: 'Staff User',
    role: 'STAFF',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('UsersSection', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockUsers(): void {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(USERS), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;
  }

  function renderSection(): void {
    renderWithProviders(<UsersSection />, {
      user: ADMIN,
      token: 'test-token',
    });
  }

  it('renders users', async () => {
    mockUsers();
    renderSection();

    expect(await screen.findByText('admin')).toBeInTheDocument();
    expect(screen.getByText('staff')).toBeInTheDocument();
  });

  it('shows the deactivate button disabled for the current user', async () => {
    mockUsers();
    renderSection();

    await screen.findByText('admin');
    const rows = screen.getAllByRole('row');
    const adminRow = rows.find((r) => within(r).queryByText('admin'));
    expect(adminRow).toBeDefined();

    const deactivateBtn = within(adminRow as HTMLElement).getByRole('button', {
      name: /deactivate/i,
    });
    expect(deactivateBtn).toBeDisabled();
  });

  it('allows deactivating another user', async () => {
    mockUsers();
    renderSection();

    await screen.findByText('staff');
    const rows = screen.getAllByRole('row');
    const staffRow = rows.find((r) => within(r).queryByText('staff'));
    const deactivateBtn = within(staffRow as HTMLElement).getByRole('button', {
      name: /deactivate/i,
    });
    expect(deactivateBtn).toBeEnabled();
  });

  it('opens the create modal', async () => {
    mockUsers();
    renderSection();

    await screen.findByText('admin');
    await userEvent.click(screen.getByRole('button', { name: /new user/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText(/^username$/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it('opens the edit modal without password fields', async () => {
    mockUsers();
    renderSection();

    await screen.findByText('staff');
    const rows = screen.getAllByRole('row');
    const staffRow = rows.find((r) => within(r).queryByText('staff'));
    const editBtn = within(staffRow as HTMLElement).getByRole('button', {
      name: /^edit$/i,
    });
    await userEvent.click(editBtn);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByLabelText(/^password$/i)).not.toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('Staff User')).toBeInTheDocument();
  });
});
