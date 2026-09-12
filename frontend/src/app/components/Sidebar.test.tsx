import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AuthProvider, type AuthenticatedUser } from '../auth/AuthContext';

function renderSidebar(user: AuthenticatedUser | null): void {
  render(
    <MemoryRouter>
      <AuthProvider user={user}>
        <Sidebar />
      </AuthProvider>
    </MemoryRouter>,
  );
}

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

const STAFF: AuthenticatedUser = {
  id: '2',
  username: 'staff',
  displayName: 'Staff',
  role: 'STAFF',
};

describe('Sidebar', () => {
  it('shows all navigation items for admins', () => {
    renderSidebar(ADMIN);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('New Sale')).toBeInTheDocument();
    expect(screen.getByText('Staff')).toBeInTheDocument();
    expect(screen.getByText('Accounts / Financial Summary')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('hides admin-only items from staff', () => {
    renderSidebar(STAFF);
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Staff')).not.toBeInTheDocument();
    expect(screen.queryByText('Accounts / Financial Summary')).not.toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('shows staff-visible items to staff', () => {
    renderSidebar(STAFF);
    expect(screen.getByText('New Sale')).toBeInTheDocument();
    expect(screen.getByText('Parlour Service')).toBeInTheDocument();
    expect(screen.getByText('Customers')).toBeInTheDocument();
  });

  it('displays the current user name and role', () => {
    renderSidebar(ADMIN);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('shows a fallback when no user is signed in', () => {
    renderSidebar(null);
    expect(screen.getByText('Not signed in')).toBeInTheDocument();
  });
});
