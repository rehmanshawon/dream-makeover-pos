import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { AuthProvider, type AuthenticatedUser } from '../auth/AuthContext';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

function renderLayout(initialPath: string): void {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider user={ADMIN}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route path="pos" element={<div>POS Page Content</div>} />
            <Route path="customers" element={<div>Customers Page Content</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('AppLayout', () => {
  it('renders the POS page title in the topbar when at /pos', () => {
    renderLayout('/pos');
    expect(screen.getByRole('heading', { name: /new sale/i, level: 1 })).toBeInTheDocument();
  });

  it('renders the customers page title in the topbar when at /customers', () => {
    renderLayout('/customers');
    expect(screen.getByRole('heading', { name: /customers/i, level: 1 })).toBeInTheDocument();
  });

  it('renders the child route content inside the layout', () => {
    renderLayout('/pos');
    expect(screen.getByText('POS Page Content')).toBeInTheDocument();
  });

  it('keeps the sidebar visible across routes', () => {
    renderLayout('/customers');
    expect(screen.getByRole('complementary', { name: /primary navigation/i })).toBeInTheDocument();
  });
});
