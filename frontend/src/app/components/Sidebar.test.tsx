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
  it('shows all navigation links for admins', () => {
    renderSidebar(ADMIN);
    expect(screen.getByRole('link', { name: /^dashboard$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^new sale$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^staff$/i })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /accounts \/ financial summary/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^settings$/i })).toBeInTheDocument();
  });

  it('hides admin-only navigation links from staff', () => {
    renderSidebar(STAFF);

    // Query by link role to avoid matching the footer user name,
    // which may contain the same word as a nav label.
    expect(screen.queryByRole('link', { name: /^dashboard$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^staff$/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /accounts \/ financial summary/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^settings$/i })).not.toBeInTheDocument();
  });

  it('shows staff-visible navigation links to staff', () => {
    renderSidebar(STAFF);
    expect(screen.getByRole('link', { name: /^new sale$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^parlour service$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^customers$/i })).toBeInTheDocument();
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
