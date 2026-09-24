import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import type { AuthenticatedUser } from '../auth/AuthContext';
import { renderWithProviders } from '../../test/render-with-providers';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

function renderLayout(initialPath: string): void {
  renderWithProviders(
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route path="pos" element={<div>POS Page Content</div>} />
        <Route path="customers" element={<div>Customers Page Content</div>} />
      </Route>
    </Routes>,
    { route: initialPath, user: ADMIN },
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

  it('does not render the obsolete manual pay-period reminder banner', () => {
    renderLayout('/pos');
    expect(screen.queryByText(/pay period has not been created yet/i)).not.toBeInTheDocument();
  });
});
